import { query } from "../db.js";
import { verifyToken } from "../utils/auth.js";

export async function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      const decoded = verifyToken(header.slice(7));
      const { rows } = await query("SELECT * FROM users WHERE id = $1", [decoded.sub]);
      if (rows[0]) req.user = rows[0];
    }
  } catch {
    /* anonymous */
  }
  next();
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const token = header.slice(7);
    const decoded = verifyToken(token);

    const { rows } = await query("SELECT * FROM users WHERE id = $1", [decoded.sub]);
    if (!rows[0]) {
      return res.status(401).json({ success: false, error: "User not found" });
    }

    req.user = rows[0];
    next();
  } catch {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}
