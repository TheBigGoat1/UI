import { query } from "../db.js";

export const DEFAULT_ALERT_RULES = [
  {
    rule_key: "watchlist_setup",
    enabled: true,
    threshold: 70,
    cooldown_sec: 3600,
    channel_in_app: true,
    channel_email: false,
    channel_push: false,
  },
  {
    rule_key: "high_confidence_idea",
    enabled: false,
    threshold: 85,
    cooldown_sec: 1800,
    channel_in_app: true,
    channel_email: false,
    channel_push: false,
  },
];

export async function ensureAlertsTables() {
  await query(
    `CREATE TABLE IF NOT EXISTS alert_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rule_key TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT true,
      threshold NUMERIC(20,8),
      cooldown_sec INT NOT NULL DEFAULT 300,
      channel_in_app BOOLEAN NOT NULL DEFAULT true,
      channel_email BOOLEAN NOT NULL DEFAULT false,
      channel_push BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, rule_key)
    )`,
  );
  await query(
    `CREATE TABLE IF NOT EXISTS alert_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      rule_key TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium',
      title TEXT NOT NULL,
      body TEXT,
      delivered_in_app BOOLEAN NOT NULL DEFAULT false,
      delivered_email BOOLEAN NOT NULL DEFAULT false,
      delivered_push BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  );
}

export async function deliverEmailIfEnabled(toEmail, title, body) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERTS_FROM_EMAIL || "alerts@insidr.local";
  if (!apiKey || !toEmail) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [toEmail],
        subject: title,
        text: body || title,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function isInCooldown(userId, ruleKey, cooldownSec) {
  if (!cooldownSec) return false;
  const { rows } = await query(
    `SELECT created_at FROM alert_events
     WHERE user_id = $1 AND rule_key = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, ruleKey],
  );
  if (!rows[0]?.created_at) return false;
  const elapsed = (Date.now() - new Date(rows[0].created_at).getTime()) / 1000;
  return elapsed < cooldownSec;
}

export async function seedDefaultAlertRules(userId) {
  await ensureAlertsTables();
  for (const rule of DEFAULT_ALERT_RULES) {
    await query(
      `INSERT INTO alert_rules (
         user_id, rule_key, enabled, threshold, cooldown_sec,
         channel_in_app, channel_email, channel_push, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
       ON CONFLICT (user_id, rule_key) DO NOTHING`,
      [
        userId,
        rule.rule_key,
        rule.enabled,
        rule.threshold,
        rule.cooldown_sec,
        rule.channel_in_app,
        rule.channel_email,
        rule.channel_push,
      ],
    );
  }
}

export async function deliverUserAlert(userId, ruleKey, { title, body, priority = "medium" }) {
  await ensureAlertsTables();

  const userRes = await query(`SELECT email FROM users WHERE id = $1`, [userId]);
  const email = userRes.rows[0]?.email;

  const rulesRes = await query(
    `SELECT * FROM alert_rules WHERE user_id = $1 AND rule_key = $2`,
    [userId, ruleKey],
  );
  const rule = rulesRes.rows[0];
  if (!rule?.enabled) return { delivered: false, reason: "disabled" };

  if (await isInCooldown(userId, ruleKey, rule.cooldown_sec)) {
    return { delivered: false, reason: "cooldown" };
  }

  const inApp = rule.channel_in_app ?? true;
  const emailChannel = rule.channel_email ?? false;
  const push = rule.channel_push ?? false;

  if (inApp) {
    await query(
      `INSERT INTO notifications (user_id, type, title, body) VALUES ($1,'info',$2,$3)`,
      [userId, title, body],
    );
  }

  const emailSent = emailChannel ? await deliverEmailIfEnabled(email, title, body) : false;

  await query(
    `INSERT INTO alert_events (
       user_id, rule_key, priority, title, body,
       delivered_in_app, delivered_email, delivered_push
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [userId, ruleKey, priority, title, body, inApp, emailSent, push],
  );

  return { delivered: true, inApp, email: emailSent, push };
}

export async function notifyWatchlistIdeas(userId, ideas = []) {
  if (!userId || !ideas.length) return;

  await seedDefaultAlertRules(userId);

  const { rows: watchRows } = await query(
    `SELECT symbol FROM watchlist WHERE user_id = $1 ORDER BY created_at ASC`,
    [userId],
  );
  const watchlist = new Set(watchRows.map((row) => String(row.symbol).toUpperCase()));
  if (!watchlist.size) return;

  const rulesRes = await query(
    `SELECT * FROM alert_rules WHERE user_id = $1 AND rule_key IN ('watchlist_setup','high_confidence_idea')`,
    [userId],
  );
  const rulesByKey = Object.fromEntries(rulesRes.rows.map((row) => [row.rule_key, row]));

  for (const idea of ideas) {
    const symbol = String(idea.asset || idea.symbol || "").toUpperCase();
    if (!symbol || !watchlist.has(symbol)) continue;

    const confidence = Number(idea.confidence ?? idea.confluence_score ?? 0);
    const direction = idea.direction || idea.side || "setup";
    const title = `Watchlist setup · ${symbol}`;
    const body = `${symbol} ${direction} at ${Math.round(confidence)}% confidence — review in Ideas.`;

    const watchRule = rulesByKey.watchlist_setup;
    if (watchRule?.enabled && confidence >= Number(watchRule.threshold ?? 70)) {
      const result = await deliverUserAlert(userId, "watchlist_setup", { title, body, priority: "high" });
      if (result.delivered) return;
    }

    const highRule = rulesByKey.high_confidence_idea;
    if (highRule?.enabled && confidence >= Number(highRule.threshold ?? 85)) {
      await deliverUserAlert(userId, "high_confidence_idea", {
        title: `High confidence · ${symbol}`,
        body,
        priority: "high",
      });
      return;
    }
  }
}
