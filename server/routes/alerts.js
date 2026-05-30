import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireCapability } from "../middleware/entitlements.js";
import {
  ensureAlertsTables,
  seedDefaultAlertRules,
  deliverEmailIfEnabled,
  deliverUserAlert,
} from "../services/alertDelivery.js";

const router = Router();

router.get("/health", requireAuth, async (_req, res) => {
  return res.json({
    success: true,
    data: {
      email_configured: Boolean(process.env.RESEND_API_KEY),
      from_email: process.env.ALERTS_FROM_EMAIL || "alerts@insidr.local",
    },
  });
});

router.get("/rules", requireAuth, requireCapability("alerts.manage"), async (req, res) => {
  await ensureAlertsTables();
  let { rows } = await query(
    `SELECT id, rule_key, enabled, threshold, cooldown_sec, channel_in_app, channel_email, channel_push, updated_at
     FROM alert_rules
     WHERE user_id = $1
     ORDER BY rule_key ASC`,
    [req.user.id],
  );

  if (!rows.length) {
    await seedDefaultAlertRules(req.user.id);
    ({ rows } = await query(
      `SELECT id, rule_key, enabled, threshold, cooldown_sec, channel_in_app, channel_email, channel_push, updated_at
       FROM alert_rules
       WHERE user_id = $1
       ORDER BY rule_key ASC`,
      [req.user.id],
    ));
  }

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

router.post("/test-email", requireAuth, requireCapability("alerts.manage"), async (req, res) => {
  if (!process.env.RESEND_API_KEY) {
    return res.status(503).json({
      success: false,
      error: "RESEND_API_KEY is not set. Add it to .env to enable email alerts.",
    });
  }

  const sent = await deliverEmailIfEnabled(
    req.user.email,
    "Insidr alert test",
    "Email alerts are working. You will receive watchlist and high-confidence setup notifications when enabled in Settings.",
  );

  if (!sent) {
    return res.status(503).json({
      success: false,
      error: "Could not send test email. Verify RESEND_API_KEY and ALERTS_FROM_EMAIL.",
    });
  }

  return res.json({ success: true, data: { sent: true, to: req.user.email } });
});

router.post("/trigger", requireAuth, requireCapability("alerts.manage"), async (req, res) => {
  const {
    rule_key = "manual_alert",
    priority = "medium",
    title = "Alert",
    body = "",
  } = req.body || {};

  const result = await deliverUserAlert(req.user.id, rule_key, { title, body, priority });
  if (!result.delivered) {
    return res.json({
      success: true,
      data: { ...result, inApp: false, email: false, push: false },
    });
  }

  return res.json({
    success: true,
    data: { inApp: result.inApp, email: result.email, push: result.push },
  });
});

export default router;
