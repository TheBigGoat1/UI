import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "insidr-dev-secret-change-me";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function toPublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.full_name || row.email?.split("@")[0] || "Trader",
    tier: row.tier || "free",
    setup_complete: row.setup_complete === true,
    subscription_status: row.subscription_status || "none",
    billing_cycle: row.billing_cycle || null,
    trial_ends_at: row.trial_ends_at || null,
    subscription_ends_at: row.subscription_ends_at || null,
  };
}

export { hasPaidAccess } from "../services/subscriptionAccess.js";
