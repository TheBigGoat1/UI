import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { toPublicUser } from "../utils/auth.js";
import {
  assertStripe,
  createCheckoutSession,
  createPortalSession,
  formatStripeError,
  mapSubscriptionToUserFields,
  stripe,
} from "../services/stripe.js";
import { tierFromPlanId } from "../config/plans.js";
import {
  accessSnapshot,
  applySubscriptionFields,
  revokePaidAccess,
  startLocalDevTrial,
  syncUserSubscription,
} from "../services/subscriptionAccess.js";

const router = Router();

async function loadUser(userId) {
  const { rows } = await query("SELECT * FROM users WHERE id = $1", [userId]);
  return rows[0];
}

router.patch("/onboarding", requireAuth, async (req, res) => {
  const metadata = req.body || {};
  const { rows } = await query(
    `UPDATE users
     SET onboarding_metadata = $2::jsonb, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [req.user.id, JSON.stringify(metadata)],
  );
  res.json({ success: true, data: toPublicUser(rows[0]) });
});

router.post("/checkout-session", requireAuth, async (req, res) => {
  try {
    const { plan = "pro", billingCycle = "monthly", context = "onboarding" } = req.body;
    if (!["pro", "elite"].includes(plan)) {
      return res.status(400).json({ success: false, error: "Invalid plan." });
    }

    const user = await loadUser(req.user.id);
    const cancelPath = context === "upgrade" ? "/dashboard/pricing" : "/onboarding";
    const successPath =
      context === "upgrade" ? "/dashboard/pricing?checkout=success" : "/onboarding/success";

    const session = await createCheckoutSession({
      user,
      planId: plan,
      billingCycle,
      successPath,
      cancelPath,
    });

    await query(
      `UPDATE users SET stripe_customer_id = COALESCE(stripe_customer_id, $2), updated_at = NOW() WHERE id = $1`,
      [user.id, session.customer],
    );

    res.json({ success: true, data: { url: session.url, sessionId: session.id } });
  } catch (err) {
    console.error("[billing] checkout-session", err);
    res.status(err.status || 500).json({
      success: false,
      error: formatStripeError(err),
    });
  }
});

/** Local 7-day trial without Stripe (dev / when Stripe account not configured) */
router.post("/dev-trial", requireAuth, async (req, res) => {
  const allowDev =
    process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_BILLING === "true";
  if (!allowDev) {
    return res.status(403).json({ success: false, error: "Dev trial not enabled." });
  }

  try {
    const { plan = "pro", billingCycle = "monthly" } = req.body;
    if (!["pro", "elite"].includes(plan)) {
      return res.status(400).json({ success: false, error: "Invalid plan." });
    }
    const user = await startLocalDevTrial(req.user.id, plan, billingCycle);
    res.json({
      success: true,
      data: {
        user: toPublicUser(user),
        access: accessSnapshot(user),
        note: "Local dev trial — no Stripe charge. Use Stripe checkout for real billing test.",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/session", requireAuth, async (req, res) => {
  try {
    const { session_id: sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: "session_id required." });
    }

    const stripeClient = assertStripe();
    const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (session.metadata?.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: "Session does not match user." });
    }

    let user = await loadUser(req.user.id);

    if (session.customer) {
      await query(
        `UPDATE users SET stripe_customer_id = $2, updated_at = NOW() WHERE id = $1`,
        [user.id, session.customer],
      );
    }

    if (session.subscription) {
      const sub =
        typeof session.subscription === "string"
          ? await stripeClient.subscriptions.retrieve(session.subscription)
          : session.subscription;
      const fields = mapSubscriptionToUserFields(sub);
      user = await applySubscriptionFields(user.id, fields);
    } else if (session.metadata?.plan_id) {
      const tier = tierFromPlanId(session.metadata.plan_id);
      const trialEnd = new Date();
      trialEnd.setUTCDate(trialEnd.getUTCDate() + 7);
      const { rows } = await query(
        `UPDATE users SET tier = $2, subscription_status = 'trialing', trial_ends_at = $3, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [user.id, tier, trialEnd.toISOString()],
      );
      user = rows[0];
    }

    const meta =
      typeof user.onboarding_metadata === "string"
        ? JSON.parse(user.onboarding_metadata)
        : user.onboarding_metadata || {};
    if (meta.watchlist?.length) {
      for (const symbol of meta.watchlist) {
        await query(
          `INSERT INTO watchlist (user_id, symbol) VALUES ($1, $2) ON CONFLICT (user_id, symbol) DO NOTHING`,
          [user.id, symbol],
        );
      }
    }

    const { rows } = await query(
      `UPDATE users SET setup_complete = true, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [user.id],
    );
    user = await syncUserSubscription(rows[0]);

    res.json({
      success: true,
      data: { ...toPublicUser(user), access: accessSnapshot(user) },
    });
  } catch (err) {
    console.error("[billing] session verify", err);
    res.status(err.status || 500).json({
      success: false,
      error: formatStripeError(err),
    });
  }
});

router.post("/portal", requireAuth, async (req, res) => {
  try {
    const user = await loadUser(req.user.id);
    const session = await createPortalSession(user);
    res.json({ success: true, data: { url: session.url } });
  } catch (err) {
    console.error("[billing] portal", err);
    res.status(err.status || 500).json({
      success: false,
      error: formatStripeError(err),
    });
  }
});

router.get("/status", requireAuth, async (req, res) => {
  let user = await loadUser(req.user.id);
  user = await syncUserSubscription(user);
  const access = accessSnapshot(user);

  res.json({
    success: true,
    data: {
      tier: user.tier,
      subscription_status: user.subscription_status,
      billing_cycle: user.billing_cycle,
      trial_ends_at: user.trial_ends_at,
      subscription_ends_at: user.subscription_ends_at,
      has_stripe: Boolean(user.stripe_customer_id),
      has_access: access.has_access,
      payment_required: access.payment_required,
      message: access.message,
    },
  });
});

export async function handleStripeWebhook(req, res) {
  if (!stripe) {
    return res.status(503).send("Stripe not configured");
  }

  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = JSON.parse(req.body.toString());
      console.warn("[stripe] STRIPE_WEBHOOK_SECRET not set — webhook signature not verified (dev only)");
    }
  } catch (err) {
    console.error("[stripe] webhook signature", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        if (userId && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          await applySubscriptionFields(userId, mapSubscriptionToUserFields(sub));
          await query(
            `UPDATE users SET stripe_customer_id = COALESCE(stripe_customer_id, $2), setup_complete = true, updated_at = NOW() WHERE id = $1`,
            [userId, session.customer],
          );
        }
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        await handleSubscriptionEvent(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const userId = await resolveUserIdFromSubscription(subscription);
        if (userId) await revokePaidAccess(userId, "canceled");
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            typeof invoice.subscription === "string"
              ? invoice.subscription
              : invoice.subscription.id,
          );
          await handleSubscriptionEvent(sub);
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            typeof invoice.subscription === "string"
              ? invoice.subscription
              : invoice.subscription.id,
          );
          const userId = await resolveUserIdFromSubscription(sub);
          if (userId) await applySubscriptionFields(userId, mapSubscriptionToUserFields(sub));
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe] webhook handler", err);
    return res.status(500).json({ error: "Webhook handler failed" });
  }

  res.json({ received: true });
}

async function resolveUserIdFromSubscription(subscription) {
  let userId = subscription.metadata?.user_id;
  if (!userId && subscription.customer) {
    const found = await query("SELECT id FROM users WHERE stripe_customer_id = $1", [
      subscription.customer,
    ]);
    userId = found.rows[0]?.id;
  }
  return userId;
}

async function handleSubscriptionEvent(subscription) {
  const userId = await resolveUserIdFromSubscription(subscription);
  if (!userId) return;

  const fields = mapSubscriptionToUserFields(subscription);
  const bad = ["canceled", "unpaid", "past_due", "incomplete_expired"].includes(
    fields.subscription_status,
  );

  if (bad) {
    await revokePaidAccess(userId, fields.subscription_status);
  } else {
    await applySubscriptionFields(userId, fields);
  }
}

export default router;
