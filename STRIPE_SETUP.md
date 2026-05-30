# Stripe subscriptions (Insidr)

Aligned with **Developer Specification v2.0**:

| Plan | Monthly | Annual | Trial |
|------|---------|--------|-------|
| Pro | $28 | $280 | 7 days |
| Elite | $79 | $790 | 7 days |

## Environment variables

Add to `.env` (never commit real keys to git):

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
FRONTEND_URL=http://localhost:5173
```

## Database

```bash
npm run db:setup
```

Applies `database/migrations/002_subscriptions.sql`.

## Local webhook (optional)

```bash
stripe listen --forward-to localhost:3001/api/v1/billing/webhook
```

Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

## User flow

1. **Register** → `/onboarding` (5 steps)
2. **Step 5** → Stripe Checkout (7-day trial)
3. **Return** → `/onboarding/success?session_id=…` → verifies → `/dashboard`
4. **Upgrade** → `/dashboard/pricing` → Checkout or **Manage billing** (Customer Portal)
5. **Pro features** → `tier` is `pro` or `elite`, or `subscription_status` is `trialing` / `active`

## API routes

- `PATCH /api/v1/billing/onboarding` — save wizard answers before checkout
- `POST /api/v1/billing/checkout-session` — `{ plan, billingCycle, context }`
- `GET /api/v1/billing/session?session_id=` — verify after redirect
- `POST /api/v1/billing/portal` — Stripe Customer Portal
- `POST /api/v1/billing/webhook` — Stripe events (raw body)
