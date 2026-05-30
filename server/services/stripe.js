import Stripe from "stripe";
import { getPlanPrice, TRIAL_DAYS } from "../config/plans.js";
import { env } from "../config/env.js";

const secretKey = env("STRIPE_SECRET_KEY");

if (!secretKey) {
  console.warn("[stripe] STRIPE_SECRET_KEY not set — billing routes will fail until configured.");
}

export const stripe = secretKey ? new Stripe(secretKey) : null;

export function assertStripe() {
  if (!stripe) {
    const err = new Error("Stripe is not configured. Add STRIPE_SECRET_KEY to .env");
    err.status = 503;
    throw err;
  }
  return stripe;
}

export function getFrontendUrl() {
  const fromEnv = env("FRONTEND_URL");
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:5173";
  }
  return "http://localhost:5173";
}

/** Best-effort: set business name (test mode usually requires Dashboard setup) */
export async function ensureStripeAccountReady(stripeClient) {
  const businessName = env("STRIPE_BUSINESS_NAME", "Insidr");
  try {
    const account = await stripeClient.accounts.retrieve();
    await stripeClient.accounts.update(account.id, {
      business_profile: {
        name: businessName,
        support_email: env("STRIPE_SUPPORT_EMAIL") || undefined,
      },
      settings: {
        branding: { name: businessName },
      },
    });
    return { ok: true, name: businessName };
  } catch (err) {
    console.warn(
      "[stripe] Set Public business name in Dashboard → Settings → Business details:",
      err.message,
    );
    return { ok: false, needsDashboard: true, error: err.message };
  }
}

export function formatStripeError(err) {
  const msg = err?.message || String(err);
  if (msg.includes("account or business name")) {
    return (
      "Stripe Checkout is blocked because the platform owner account is missing a Public business name. " +
      "End users do NOT need a business account. Set it once at https://dashboard.stripe.com/settings/business-details " +
      "(or add STRIPE_BUSINESS_NAME=Insidr to .env and restart the API). " +
      `Original: ${msg}`
    );
  }
  return msg;
}

export async function getOrCreateStripeCustomer(stripeClient, user) {
  if (user.stripe_customer_id) {
    try {
      const existing = await stripeClient.customers.retrieve(user.stripe_customer_id);
      if (!existing.deleted) return existing.id;
    } catch {
      /* create new */
    }
  }

  const customer = await stripeClient.customers.create({
    email: user.email,
    name: user.full_name || undefined,
    metadata: { user_id: user.id },
  });

  return customer.id;
}

export async function createCheckoutSession({
  user,
  planId,
  billingCycle,
  successPath = "/onboarding/success",
  cancelPath = "/onboarding",
}) {
  const stripeClient = assertStripe();
  await ensureStripeAccountReady(stripeClient);

  const price = getPlanPrice(planId, billingCycle);
  if (!price) {
    const err = new Error("Invalid plan or billing cycle.");
    err.status = 400;
    throw err;
  }

  const customerId = await getOrCreateStripeCustomer(stripeClient, user);
  const frontend = getFrontendUrl();
  const productName = planId === "elite" ? "Insidr Elite" : "Insidr Pro";

  const session = await stripeClient.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: productName,
            description: `${TRIAL_DAYS}-day free trial, then billed ${billingCycle === "annual" ? "yearly" : "monthly"}. Cancel anytime.`,
          },
          unit_amount: price.amount,
          recurring: { interval: price.interval },
        },
        quantity: 1,
      },
    ],
    payment_method_collection: "always",
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      trial_settings: {
        end_behavior: {
          missing_payment_method: "cancel",
        },
      },
      metadata: {
        user_id: user.id,
        plan_id: planId,
        billing_cycle: billingCycle,
      },
    },
    metadata: {
      user_id: user.id,
      plan_id: planId,
      billing_cycle: billingCycle,
    },
    success_url: `${frontend}${successPath}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontend}${cancelPath}`,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    custom_text: {
      submit: {
        message: `Start your ${TRIAL_DAYS}-day free trial. You won't be charged until the trial ends.`,
      },
    },
  });

  return session;
}

export async function createPortalSession(user) {
  const stripeClient = assertStripe();
  if (!user.stripe_customer_id) {
    const err = new Error("No billing account found. Subscribe to a plan first.");
    err.status = 400;
    throw err;
  }

  const session = await stripeClient.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${getFrontendUrl()}/dashboard/settings`,
  });

  return session;
}

export function mapSubscriptionToUserFields(subscription) {
  const status = subscription.status;
  const planMeta = subscription.metadata?.plan_id;

  const paidTier =
    status === "active" || status === "trialing"
      ? planMeta === "elite"
        ? "elite"
        : planMeta === "pro"
          ? "pro"
          : "pro"
      : "free";

  return {
    stripe_subscription_id: subscription.id,
    subscription_status: status,
    tier: paidTier,
    trial_ends_at: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
    subscription_ends_at: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    billing_cycle: subscription.metadata?.billing_cycle || null,
  };
}
