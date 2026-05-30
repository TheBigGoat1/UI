/**
 * Insidr subscription tiers — aligned with Developer Specification v2.0
 * Pro: $28/mo · $280/yr | Elite: $79/mo · $790/yr | 7-day trial
 */
export const TRIAL_DAYS = 7;

export const PLANS = {
  pro: {
    tier: "pro",
    name: "Insidr Pro",
    monthly: { amount: 2800, interval: "month" },
    annual: { amount: 28000, interval: "year" },
  },
  elite: {
    tier: "elite",
    name: "Insidr Elite",
    monthly: { amount: 7900, interval: "month" },
    annual: { amount: 79000, interval: "year" },
  },
};

export function getPlanPrice(planId, billingCycle) {
  const plan = PLANS[planId];
  if (!plan) return null;
  return plan[billingCycle === "annual" ? "annual" : "monthly"];
}

export function tierFromPlanId(planId) {
  return PLANS[planId]?.tier || "free";
}
