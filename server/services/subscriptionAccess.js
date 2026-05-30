import { query } from "../db.js";
import { TRIAL_DAYS } from "../config/plans.js";
import { assertStripe, mapSubscriptionToUserFields } from "./stripe.js";

const PAID_STATUSES = new Set(["active", "trialing"]);
const REVOKED_STATUSES = new Set([
  "canceled",
  "unpaid",
  "past_due",
  "incomplete",
  "incomplete_expired",
  "paused",
]);

export function hasPaidAccess(user) {
  if (!user) return false;
  const status = user.subscription_status || "none";
  const tier = user.tier || "free";

  if (!PAID_STATUSES.has(status)) return false;
  if (tier !== "pro" && tier !== "elite") return false;

  if (status === "trialing" && user.trial_ends_at) {
    const end = new Date(user.trial_ends_at).getTime();
    if (Date.now() > end) return false;
  }

  return true;
}

export const CAPABILITIES = {
  "ideas.generate": ["pro", "elite"],
  "backtest.run": ["pro", "elite"],
  "chat.advanced": ["elite"],
  "alerts.manage": ["pro", "elite"],
  "broker.sync": ["pro", "elite"],
  "admin.observe": ["admin", "super_admin", "support_admin"],
};

export function userCapabilities(user) {
  const tier = user?.tier || "free";
  const status = user?.subscription_status || "none";
  const paid = hasPaidAccess(user);
  const caps = {
    tier,
    status,
    paid,
    available: [],
  };

  for (const [cap, tiers] of Object.entries(CAPABILITIES)) {
    if (tiers.includes(tier) && (tier === "free" || paid || cap === "admin.observe")) {
      caps.available.push(cap);
    }
  }
  return caps;
}

export function hasCapability(user, capability) {
  const caps = userCapabilities(user);
  return caps.available.includes(capability);
}

export function capabilityUpgradeHint(capability) {
  const tiers = CAPABILITIES[capability] || ["pro"];
  const primary = tiers.includes("elite") && !tiers.includes("pro") ? "elite" : "pro";
  return {
    required_tiers: tiers,
    upgrade_to: primary,
    pricing_path: "/dashboard/pricing",
  };
}

export function accessSnapshot(user) {
  const paid = hasPaidAccess(user);
  const status = user.subscription_status || "none";
  const trialEnd = user.trial_ends_at ? new Date(user.trial_ends_at) : null;
  const trialExpired =
    status === "trialing" && trialEnd && Date.now() > trialEnd.getTime();

  return {
    has_access: paid,
    tier: user.tier || "free",
    subscription_status: status,
    trial_ends_at: user.trial_ends_at,
    subscription_ends_at: user.subscription_ends_at,
    trial_expired: trialExpired,
    payment_required: trialExpired || REVOKED_STATUSES.has(status),
    message: paid
      ? status === "trialing"
        ? `Trial active until ${trialEnd?.toLocaleDateString()}`
        : "Subscription active"
      : trialExpired
        ? "Trial ended — add a payment method to continue"
        : REVOKED_STATUSES.has(status)
          ? "Subscription inactive — please update billing"
          : "No active subscription",
  };
}

/** Downgrade user when payment fails or trial ends without payment */
export async function revokePaidAccess(userId, reason = "payment_required") {
  const { rows } = await query(
    `UPDATE users SET
      tier = 'free',
      subscription_status = $2,
      updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [userId, reason === "trial_ended" ? "trial_expired" : "past_due"],
  );
  return rows[0];
}

export async function applySubscriptionFields(userId, fields) {
  const { rows } = await query(
    `UPDATE users SET
      stripe_subscription_id = $2,
      subscription_status = $3,
      tier = $4,
      trial_ends_at = $5,
      subscription_ends_at = $6,
      billing_cycle = COALESCE($7, billing_cycle),
      updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      userId,
      fields.stripe_subscription_id,
      fields.subscription_status,
      fields.tier,
      fields.trial_ends_at,
      fields.subscription_ends_at,
      fields.billing_cycle,
    ],
  );
  return rows[0];
}

/** Sync from Stripe + expire stale trials */
export async function syncUserSubscription(user) {
  if (!user) return user;

  let updated = user;

  if (user.stripe_subscription_id) {
    try {
      const stripeClient = assertStripe();
      const sub = await stripeClient.subscriptions.retrieve(user.stripe_subscription_id);
      const fields = mapSubscriptionToUserFields(sub);

      if (REVOKED_STATUSES.has(fields.subscription_status)) {
        updated = await revokePaidAccess(user.id, fields.subscription_status);
      } else {
        updated = await applySubscriptionFields(user.id, fields);
      }
    } catch (err) {
      console.warn("[billing] sync subscription", err.message);
    }
  }

  if (
    updated.subscription_status === "trialing" &&
    updated.trial_ends_at &&
    Date.now() > new Date(updated.trial_ends_at).getTime()
  ) {
    updated = await revokePaidAccess(updated.id, "trial_ended");
  }

  return updated;
}

export async function startLocalDevTrial(userId, planId, billingCycle = "monthly") {
  const trialEnd = new Date();
  trialEnd.setUTCDate(trialEnd.getUTCDate() + TRIAL_DAYS);
  const tier = planId === "elite" ? "elite" : "pro";

  const { rows } = await query(
    `UPDATE users SET
      tier = $2,
      subscription_status = 'trialing',
      trial_ends_at = $3,
      billing_cycle = $4,
      setup_complete = true,
      updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [userId, tier, trialEnd.toISOString(), billingCycle],
  );
  return rows[0];
}
