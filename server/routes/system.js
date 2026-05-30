import { Router } from "express";
import { query, testConnection } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { getIntegrationsHealth } from "../services/integrationsHealth.js";
import { ENV_FILE } from "../config/env.js";

const router = Router();

router.get("/health", async (_req, res) => {
  try {
    const db = await testConnection();
    res.json({
      success: true,
      data: { online: true, database: "postgres", serverTime: db.now },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: "Database unreachable",
      details: error.message,
    });
  }
});

router.get("/data-sources", async (_req, res) => {
  try {
    const data = await getIntegrationsHealth();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/env-path", (_req, res) => {
  res.json({ success: true, data: { path: ENV_FILE } });
});

router.get("/notifications", requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT id, type, title, body, is_read, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 100`,
    [req.user.id],
  );
  res.json({ success: true, data: rows });
});

router.get("/logs", requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT id, level, message, context, created_at
     FROM system_logs
     WHERE user_id = $1 OR user_id IS NULL
     ORDER BY created_at DESC
     LIMIT 200`,
    [req.user.id],
  );
  res.json({ success: true, data: rows });
});

export default router;
