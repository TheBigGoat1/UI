# API Keys Guide

## News feeds (primary — free tier)

| Provider | Env var | Sign up |
|----------|---------|---------|
| **NewsAPI.org** | `NEWSAPI_API_KEY` | [newsapi.org](https://newsapi.org/) |
| **NewsData.io** | `NEWSDATA_API_KEY` | [newsdata.io](https://newsdata.io/) |
| **CoinDesk** | *(none)* | RSS — always on |
| **CryptoPanic** | `CRYPTOPANIC_API_KEY` | [cryptopanic.com/developers/api](https://cryptopanic.com/developers/api/) |

All news is fetched **on the server** (keys stay in `.env`, not `VITE_*`).

```env
# File: UI-main/.env (loaded automatically by the API on startup)
NEWSAPI_API_KEY=your_key
NEWSDATA_API_KEY=your_key          # NewsData keys often start with pub_
CRYPTOPANIC_API_KEY=your_auth_token # NOT the pub_ key — get from CryptoPanic developer API
CRYPTOPANIC_API_PLAN=developer
```

- **NewsAPI**: uses `top-headlines` on the free tier (~100 req/day). Restart API after editing `.env`.
- **NewsData**: `/api/1/crypto` — use your key from [newsdata.io](https://newsdata.io/). Keys starting with `pub_` belong here, not under CryptoPanic.
- **CoinDesk**: no key; RSS merged automatically.
- **CryptoPanic**: `auth_token` from [cryptopanic.com/developers/api](https://cryptopanic.com/developers/api/) only.

On the **News** page, green/red chips show live connection status from your `.env`.

GNews (`GNEWS_API_KEY`) is **optional legacy fallback** only if NewsAPI is not set.

## Twelve Data (optional — FX/commodities)

```env
TWELVE_DATA_API_KEY=your_key_here
```

Sign up: [twelvedata.com](https://twelvedata.com/). Crypto still uses Binance (no key).

## Anthropic Claude (AI ideas + chat)

```env
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

## Stripe (billing & 7-day trial)

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_BUSINESS_NAME=Insidr
FRONTEND_URL=http://localhost:5173
```

1. Create keys at [Stripe Dashboard → API keys](https://dashboard.stripe.com/test/apikeys) (use **Test mode**).
2. Set **Public business name** at [Business details](https://dashboard.stripe.com/test/settings/business-details) — required for Checkout.
3. Or add `STRIPE_BUSINESS_NAME=Insidr` to `.env`; the API sets it on startup/checkout.
4. Match `FRONTEND_URL` to your Vite port (`5173` or `5174`).
5. Webhooks (optional for auto logout after failed payment): point to `http://localhost:3001/api/v1/billing/webhook` via Stripe CLI:
   `stripe listen --forward-to localhost:3001/api/v1/billing/webhook`

**Trial flow:** Card collected at signup → $0 for 7 days → auto-charge on day 8 → if payment fails, user is signed out.

**Dev without Stripe:** On Plans page in development, use **“Dev: trial without Stripe”**.

## Admin oversight and rescue access

```env
ADMIN_EMAILS=owner@yourdomain.com,security@yourdomain.com
```

- `ADMIN_EMAILS` users are treated as `super_admin` and can always enter `/admin/login`.
- In Admin Control Center, you can add more responders with roles:
  - `super_admin`
  - `admin`
  - `support_admin`
- Extra admins are stored in the database and can be removed from the same admin page.
- This keeps a fixed owner allowlist in env plus flexible in-app admin operations for emergencies.

## Realtime and alerts (free-first)

```env
REDIS_URL=redis://default:password@host:port
RESEND_API_KEY=re_xxx
ALERTS_FROM_EMAIL=alerts@yourdomain.com
```

- Redis powers realtime cache/pubsub for websocket updates.
- Alerts engine supports in-app events now, with optional email delivery through Resend.
- Push channel is scaffolded in preferences and event logs for incremental rollout.

## PostgreSQL

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/insidr
JWT_SECRET=your-secret
```

## Binance (crypto prices — no key)

Crypto pairs use the public Binance API automatically.

## Exchange keys (in app UI)

Binance, Bybit, OKX — **Dashboard → Connections** (read-only).

## First-time setup

```bash
npm run db:setup
npm run db:seed
npm run db:seed-dashboard
npm run dev:all
```

Restart the API after editing `.env`. Check **Dashboard → Help → System status** for NewsAPI / NewsData / CoinDesk / CryptoPanic.

## Sync news into database

```bash
npm run news:sync
```

Or use **News → Refresh** in the app.
