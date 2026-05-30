import { Router } from "express";
import crypto from "crypto";
import { query } from "../db.js";
import {
  hashPassword,
  signToken,
  toPublicUser,
  verifyPassword,
} from "../utils/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { syncUserSubscription, accessSnapshot } from "../services/subscriptionAccess.js";
import {
  validatePasswordStrength,
  PASSWORD_POLICY_TEXT,
} from "../utils/passwordPolicy.js";

const router = Router();

router.post("/register", async (req, res) => {
  const { email, password, fullName } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Email and password are required." });
  }
  const check = validatePasswordStrength(password);
  if (!check.valid) {
    return res.status(400).json({
      success: false,
      error: `${PASSWORD_POLICY_TEXT} Missing: ${check.issues.join(", ")}.`,
    });
  }

  const existing = await query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
  if (existing.rows[0]) {
    return res.status(409).json({ success: false, error: "Email already registered." });
  }

  const passwordHash = await hashPassword(password);
  const { rows } = await query(
    `INSERT INTO users (email, password_hash, full_name, setup_complete, tier)
     VALUES ($1, $2, $3, false, 'free')
     RETURNING *`,
    [email.toLowerCase(), passwordHash, fullName || email.split("@")[0]],
  );

  const user = rows[0];
  const token = signToken(user);

  res.json({
    success: true,
    data: { user: toPublicUser(user), token },
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Email and password are required." });
  }

  const { rows } = await query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  const user = rows[0];

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ success: false, error: "Invalid credentials." });
  }

  const token = signToken(user);
  res.json({
    success: true,
    data: { user: toPublicUser(user), token },
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await syncUserSubscription(req.user);
  const access = accessSnapshot(user);
  res.json({
    success: true,
    data: {
      ...toPublicUser(user),
      has_access: access.has_access,
      payment_required: access.payment_required,
    },
  });
});

router.patch("/setup-complete", requireAuth, async (req, res) => {
  const metadata = req.body || {};
  const { rows } = await query(
    `UPDATE users
     SET setup_complete = true, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [req.user.id],
  );

  if (metadata.watchlist?.length) {
    for (const symbol of metadata.watchlist) {
      await query(
        `INSERT INTO watchlist (user_id, symbol)
         VALUES ($1, $2)
         ON CONFLICT (user_id, symbol) DO NOTHING`,
        [req.user.id, symbol],
      );
    }
  }

  res.json({ success: true, data: toPublicUser(rows[0]) });
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: "Email is required." });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000);

  await query(
    `UPDATE users
     SET reset_token = $1, reset_token_expires = $2, updated_at = NOW()
     WHERE email = $3`,
    [token, expires, email.toLowerCase()],
  );

  if (process.env.NODE_ENV !== "production") {
    console.log(`[dev] Password reset link: http://localhost:5173/update-password?token=${token}`);
  }

  res.json({
    success: true,
    message: "If an account exists, reset instructions were generated.",
  });
});

router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ success: false, error: "Token and password are required." });
  }
  const check = validatePasswordStrength(password);
  if (!check.valid) {
    return res.status(400).json({
      success: false,
      error: `${PASSWORD_POLICY_TEXT} Missing: ${check.issues.join(", ")}.`,
    });
  }

  const { rows } = await query(
    `SELECT * FROM users
     WHERE reset_token = $1 AND reset_token_expires > NOW()`,
    [token],
  );

  const user = rows[0];
  if (!user) {
    return res.status(400).json({ success: false, error: "Invalid or expired reset token." });
  }

  const passwordHash = await hashPassword(password);
  await query(
    `UPDATE users
     SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW()
     WHERE id = $2`,
    [passwordHash, user.id],
  );

  res.json({ success: true, message: "Password updated." });
});

router.patch("/password", requireAuth, async (req, res) => {
  const { password } = req.body;
  const check = validatePasswordStrength(password);
  if (!check.valid) {
    return res.status(400).json({
      success: false,
      error: `${PASSWORD_POLICY_TEXT} Missing: ${check.issues.join(", ")}.`,
    });
  }

  const passwordHash = await hashPassword(password);
  await query(
    `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
    [passwordHash, req.user.id],
  );

  res.json({ success: true, message: "Password updated." });
});

export default router;
