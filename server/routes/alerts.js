import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireCapability } from "../middleware/entitlements.js";

const router = Router();

async function ensureAlertsTables() {
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

async function deliverEmailIfEnabled(toEmail, title, body) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERTS_FROM_EMAIL || "alerts@insidr.local";
  if (!apiKey || !toEmail) return false;
  try {
    await fetch("https://api.resend.com/emails", {
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
    return true;
  } catch {
    return false;
  }
}

router.get("/rules", requireAuth, requireCapability("alerts.manage"), async (req, res) => {
  await ensureAlertsTables();
  const { rows } = await query(
    `SELECT id, rule_key, enabled, threshold, cooldown_sec, channel_in_app, channel_email, channel_push, updated_at
     FROM alert_rules
     WHERE user_id = $1
     ORDER BY rule_key ASC`,
    [req.user.id],
  );
  return res.json({ success: true, data: rows });
});

router.put("/rules/:ruleKey", requireAuth, requireCapability("alerts.manage"), async (req, res) => {
  await ensureAlertsTables();
  const { ruleKey } = req.params;
  const {
    enabled = true,
    threshold = null,
    cooldown_sec = 300,
    channel_in_app = true,
    channel_email = false,
    channel_push = false,
  } = req.body || {};
  const { rows } = await query(
    `INSERT INTO alert_rules (user_id, rule_key, enabled, threshold, cooldown_sec, channel_in_app, channel_email, channel_push, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
     ON CONFLICT (user_id, rule_key)
     DO UPDATE SET enabled = EXCLUDED.enabled,
                   threshold = EXCLUDED.threshold,
                   cooldown_sec = EXCLUDED.cooldown_sec,
                   channel_in_app = EXCLUDED.channel_in_app,
                   channel_email = EXCLUDED.channel_email,
                   channel_push = EXCLUDED.channel_push,
                   updated_at = NOW()
     RETURNING *`,
    [req.user.id, ruleKey, enabled, threshold, cooldown_sec, channel_in_app, channel_email, channel_push],
  );
  return res.json({ success: true, data: rows[0] });
});

router.get("/events", requireAuth, async (req, res) => {
  await ensureAlertsTables();
  const { rows } = await query(
    `SELECT id, rule_key, priority, title, body, delivered_in_app, delivered_email, delivered_push, created_at
     FROM alert_events
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 200`,
    [req.user.id],
  );
  return res.json({ success: true, data: rows });
});

router.post("/trigger", requireAuth, requireCapability("alerts.manage"), async (req, res) => {
  await ensureAlertsTables();
  const {
    rule_key = "manual_alert",
    priority = "medium",
    title = "Alert",
    body = "",
  } = req.body || {};
  const rulesRes = await query(
    `SELECT * FROM alert_rules WHERE user_id = $1 AND rule_key = $2`,
    [req.user.id, rule_key],
  );
  const rule = rulesRes.rows[0];
  const inApp = rule?.channel_in_app ?? true;
  const email = rule?.channel_email ?? false;
  const push = rule?.channel_push ?? false;

  if (inApp) {
    await query(
      `INSERT INTO notifications (user_id, type, title, body) VALUES ($1,'warning',$2,$3)`,
      [req.user.id, title, body],
    );
  }
  const emailSent = email ? await deliverEmailIfEnabled(req.user.email, title, body) : false;
  await query(
    `INSERT INTO alert_events (user_id, rule_key, priority, title, body, delivered_in_app, delivered_email, delivered_push)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [req.user.id, rule_key, priority, title, body, inApp, emailSent, push],
  );
  return res.json({ success: true, data: { inApp, email: emailSent, push } });
});

export default router;
