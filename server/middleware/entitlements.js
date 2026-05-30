import {
  hasCapability,
  capabilityUpgradeHint,
  accessSnapshot,
} from "../services/subscriptionAccess.js";

export function requireCapability(capability) {
  return (req, res, next) => {
    const user = req.user || null;
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    if (hasCapability(user, capability)) return next();

    return res.status(403).json({
      success: false,
      error: "Upgrade required to access this feature.",
      code: "capability_required",
      capability,
      access: accessSnapshot(user),
      upgrade: capabilityUpgradeHint(capability),
    });
  };
}
