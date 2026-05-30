import { requireAuth, optionalAuth } from "./auth.js";
import { requireCapability } from "./entitlements.js";

/** Pro/Elite in production; any logged-in (or dev-anonymous) user in dev for local testing */
export function requireBacktestAccess(req, res, next) {
  const devOpen =
    process.env.NODE_ENV !== "production" || process.env.ALLOW_FREE_BACKTEST === "true";

  if (!req.user) {
    if (devOpen) {
      req.user = { id: "dev-local-user", email: "dev@local.test" };
      return next();
    }
    return res.status(401).json({ success: false, error: "Sign in to run backtests." });
  }

  if (devOpen) return next();
  return requireCapability("backtest.run")(req, res, next);
}

export { requireAuth, optionalAuth };
