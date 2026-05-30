import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function parseAdminEmailsFromEnv() {
  return String(process.env.ADMIN_EMAILS || "demo@insidr.local")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

async function ensureAdminTables() {
  await query(
    `CREATE TABLE IF NOT EXISTS admin_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  );
  await query(
    `CREATE TABLE IF NOT EXISTS incidents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'open',
      details TEXT,
      created_by TEXT,
      acknowledged_by TEXT,
      resolved_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  );
  await query(
    `CREATE TABLE IF NOT EXISTS provider_sla (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unknown',
      latency_ms INT,
      error_rate NUMERIC(8,4) DEFAULT 0,
      sample_size INT DEFAULT 0,
      checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  );
  await query(
    `CREATE TABLE IF NOT EXISTS job_heartbeats (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ok',
      detail TEXT,
      last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  );
}

async function getAdminRegistry() {
  await ensureAdminTables();
  const envAdmins = parseAdminEmailsFromEnv();
  const { rows } = await query(
    `SELECT email, role, is_active, created_by, created_at, updated_at
     FROM admin_roles
     WHERE is_active = true
     ORDER BY created_at ASC`,
  );
  const map = new Map();
  for (const email of envAdmins) {
    map.set(email, {
      email,
      role: "super_admin",
      source: "env",
      is_active: true,
    });
  }
  for (const row of rows) {
    const email = String(row.email || "").toLowerCase().trim();
    if (!email) continue;
    if (!map.has(email)) {
      map.set(email, {
        ...row,
        email,
        source: "db",
      });
    }
  }
  return Array.from(map.values());
}

async function getAdminAccess(email) {
  const normalized = String(email || "").toLowerCase().trim();
  if (!normalized) return { isAdmin: false, role: null, source: null };
  const admins = await getAdminRegistry();
  const match = admins.find((x) => x.email === normalized);
  return {
    isAdmin: Boolean(match),
    role: match?.role || null,
    source: match?.source || null,
  };
}

async function requireAdmin(req, res, next) {
  const email = String(req.user?.email || "").toLowerCase();
  const access = await getAdminAccess(email);
  if (!access.isAdmin) {
    return res.status(403).json({ success: false, error: "Admin access required." });
  }
  req.admin = access;
  return next();
}

function requireAdminRole(roles) {
  return (req, res, next) => {
    const role = req.admin?.role || "admin";
    if (!roles.includes(role)) {
      return res.status(403).json({ success: false, error: "Insufficient admin role." });
    }
    return next();
  };
}

router.get("/access", requireAuth, async (req, res) => {
  const email = String(req.user?.email || "").toLowerCase();
  const access = await getAdminAccess(email);
  return res.json({
    success: true,
    data: {
      isAdmin: access.isAdmin,
      email,
      role: access.role,
      source: access.source,
    },
  });
});

router.get("/admins", requireAuth, requireAdmin, async (_req, res) => {
  const admins = await getAdminRegistry();
  return res.json({ success: true, data: admins });
});

router.post("/admins", requireAuth, requireAdmin, requireAdminRole(["super_admin"]), async (req, res) => {
  const actor = String(req.user?.email || "").toLowerCase();
  const { email, role = "admin" } = req.body || {};
  const normalized = String(email || "").toLowerCase().trim();
  const allowedRoles = ["super_admin", "admin", "support_admin"];
  if (!normalized || !normalized.includes("@")) {
    return res.status(400).json({ success: false, error: "Valid admin email is required." });
  }
  if (!allowedRoles.includes(String(role))) {
    return res.status(400).json({ success: false, error: "Invalid admin role." });
  }
  await ensureAdminTables();
  const { rows } = await query(
    `INSERT INTO admin_roles (email, role, is_active, created_by, updated_at)
     VALUES ($1, $2, true, $3, NOW())
     ON CONFLICT (email)
     DO UPDATE SET role = EXCLUDED.role, is_active = true, updated_at = NOW()
     RETURNING email, role, is_active, created_by, created_at, updated_at`,
    [normalized, role, actor],
  );
  return res.json({ success: true, data: rows[0] });
});

router.delete(
  "/admins/:email",
  requireAuth,
  requireAdmin,
  requireAdminRole(["super_admin"]),
  async (req, res) => {
  const email = decodeURIComponent(String(req.params.email || "")).toLowerCase().trim();
  if (!email || !email.includes("@")) {
    return res.status(400).json({ success: false, error: "Valid admin email is required." });
  }
  await ensureAdminTables();
  await query(
    `UPDATE admin_roles
     SET is_active = false, updated_at = NOW()
     WHERE email = $1`,
    [email],
  );
    return res.json({ success: true });
  },
);

router.get("/overview", requireAuth, requireAdmin, async (_req, res) => {
  const admins = await getAdminRegistry();
  const usersRes = await query(
    `SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE setup_complete = true)::int AS onboarded,
      COUNT(*) FILTER (WHERE subscription_status = 'active')::int AS active,
      COUNT(*) FILTER (WHERE subscription_status = 'trialing')::int AS trialing,
      COUNT(*) FILTER (WHERE tier = 'elite')::int AS elite,
      COUNT(*) FILTER (WHERE tier = 'pro')::int AS pro
     FROM users`,
  );
  const users = usersRes.rows[0] || {};
  res.json({
    success: true,
    data: {
      ...users,
      admin_count: admins.length,
    },
  });
});

router.get("/observability/providers", requireAuth, requireAdmin, async (_req, res) => {
  await ensureAdminTables();
  const { rows } = await query(
    `SELECT provider, status, latency_ms, error_rate, sample_size, checked_at
     FROM provider_sla
     ORDER BY checked_at DESC
     LIMIT 200`,
  );
  return res.json({ success: true, data: rows });
});

router.post("/observability/providers", requireAuth, requireAdmin, async (req, res) => {
  await ensureAdminTables();
  const {
    provider,
    status = "unknown",
    latency_ms = null,
    error_rate = 0,
    sample_size = 0,
  } = req.body || {};
  if (!provider) return res.status(400).json({ success: false, error: "provider is required." });
  const { rows } = await query(
    `INSERT INTO provider_sla (provider, status, latency_ms, error_rate, sample_size, checked_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING provider, status, latency_ms, error_rate, sample_size, checked_at`,
    [provider, status, latency_ms, error_rate, sample_size],
  );
  return res.json({ success: true, data: rows[0] });
});

router.get("/observability/errors", requireAuth, requireAdmin, async (_req, res) => {
  const { rows } = await query(
    `SELECT level, message, COUNT(*)::int AS count, MAX(created_at) AS last_seen
     FROM system_logs
     WHERE level IN ('warn', 'error')
     GROUP BY level, message
     ORDER BY last_seen DESC
     LIMIT 200`,
  );
  return res.json({ success: true, data: rows });
});

router.get("/observability/jobs", requireAuth, requireAdmin, async (_req, res) => {
  await ensureAdminTables();
  const { rows } = await query(
    `SELECT job_name, status, detail, last_seen
     FROM job_heartbeats
     ORDER BY last_seen DESC
     LIMIT 200`,
  );
  return res.json({ success: true, data: rows });
});

router.post("/observability/jobs", requireAuth, requireAdmin, async (req, res) => {
  await ensureAdminTables();
  const { job_name, status = "ok", detail = null } = req.body || {};
  if (!job_name) return res.status(400).json({ success: false, error: "job_name is required." });
  const { rows } = await query(
    `INSERT INTO job_heartbeats (job_name, status, detail, last_seen)
     VALUES ($1, $2, $3, NOW())
     RETURNING job_name, status, detail, last_seen`,
    [job_name, status, detail],
  );
  return res.json({ success: true, data: rows[0] });
});

router.get("/incidents", requireAuth, requireAdmin, async (_req, res) => {
  await ensureAdminTables();
  const { rows } = await query(
    `SELECT id, title, severity, status, details, created_by, acknowledged_by, resolved_by, created_at, updated_at
     FROM incidents
     ORDER BY updated_at DESC
     LIMIT 200`,
  );
  return res.json({ success: true, data: rows });
});

router.post("/incidents", requireAuth, requireAdmin, async (req, res) => {
  await ensureAdminTables();
  const actor = String(req.user?.email || "").toLowerCase();
  const { title, severity = "medium", details = "" } = req.body || {};
  if (!title) return res.status(400).json({ success: false, error: "title is required." });
  const { rows } = await query(
    `INSERT INTO incidents (title, severity, status, details, created_by, updated_at)
     VALUES ($1, $2, 'open', $3, $4, NOW())
     RETURNING *`,
    [title, severity, details, actor],
  );
  return res.json({ success: true, data: rows[0] });
});

router.patch("/incidents/:id", requireAuth, requireAdmin, async (req, res) => {
  await ensureAdminTables();
  const actor = String(req.user?.email || "").toLowerCase();
  const { id } = req.params;
  const { status, details } = req.body || {};
  const allowed = ["open", "acknowledged", "resolved"];
  if (!allowed.includes(String(status || ""))) {
    return res.status(400).json({ success: false, error: "Invalid incident status." });
  }
  const ackBy = status === "acknowledged" ? actor : null;
  const resolvedBy = status === "resolved" ? actor : null;
  const { rows } = await query(
    `UPDATE incidents
     SET status = $2,
         details = COALESCE($3, details),
         acknowledged_by = COALESCE($4, acknowledged_by),
         resolved_by = COALESCE($5, resolved_by),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, status, details ?? null, ackBy, resolvedBy],
  );
  if (!rows[0]) return res.status(404).json({ success: false, error: "Incident not found." });
  return res.json({ success: true, data: rows[0] });
});

router.get("/audit", requireAuth, requireAdmin, async (_req, res) => {
  const { rows } = await query(
    `SELECT id, level, message, context, created_at
     FROM system_logs
     ORDER BY created_at DESC
     LIMIT 300`,
  );
  return res.json({ success: true, data: rows });
});

router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  const q = String(req.query.q || "").trim();
  const status = String(req.query.status || "all").toLowerCase();
  const tier = String(req.query.tier || "all").toLowerCase();

  const filters = [];
  const params = [];
  let i = 1;

  if (q) {
    filters.push(`(email ILIKE $${i} OR full_name ILIKE $${i})`);
    params.push(`%${q}%`);
    i++;
  }
  if (status !== "all") {
    filters.push(`subscription_status = $${i++}`);
    params.push(status);
  }
  if (tier !== "all") {
    filters.push(`tier = $${i++}`);
    params.push(tier);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT id, email, full_name, tier, subscription_status, billing_cycle,
            trial_ends_at, subscription_ends_at, setup_complete, created_at, updated_at
     FROM users
     ${where}
     ORDER BY created_at DESC
     LIMIT 300`,
    params,
  );

  res.json({ success: true, data: rows });
});

router.patch("/users/:id/subscription", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    tier = "free",
    subscription_status = "none",
    billing_cycle = null,
    trial_ends_at = null,
    subscription_ends_at = null,
  } = req.body || {};

  const allowedTier = ["free", "pro", "elite"];
  const allowedStatus = [
    "none",
    "trialing",
    "active",
    "canceled",
    "past_due",
    "trial_expired",
    "payment_required",
  ];
  if (!allowedTier.includes(String(tier)) || !allowedStatus.includes(String(subscription_status))) {
    return res.status(400).json({ success: false, error: "Invalid tier or subscription status." });
  }

  const { rows } = await query(
    `UPDATE users
     SET tier = $2,
         subscription_status = $3,
         billing_cycle = $4,
         trial_ends_at = $5,
         subscription_ends_at = $6,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, email, full_name, tier, subscription_status, billing_cycle, trial_ends_at, subscription_ends_at, updated_at`,
    [id, tier, subscription_status, billing_cycle, trial_ends_at, subscription_ends_at],
  );

  if (!rows[0]) return res.status(404).json({ success: false, error: "User not found." });
  return res.json({ success: true, data: rows[0] });
});

export default router;
