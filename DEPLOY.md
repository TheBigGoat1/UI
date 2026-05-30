# Deploying Insidr

Insidr is split into two deploy targets:

| Component | Host | Build output |
|-----------|------|--------------|
| **Frontend** (React/Vite) | [Vercel](https://vercel.com) | `dist/` from `npm run build` |
| **API** (Express + PostgreSQL) | [Railway](https://railway.app) | `node server/index.js` |

---

## 1. Database (PostgreSQL)

Create a PostgreSQL database on Railway, Supabase, Neon, or similar. Run migrations once:

```bash
DATABASE_URL=postgresql://... npm run db:setup
```

Optional demo seed:

```bash
npm run db:seed
```

---

## 2. API on Railway

1. Connect this repo to Railway.
2. Railway reads `railway.toml` — start command `node server/index.js`, health check `/api/v1/trader/ping`.
3. Set environment variables (see `.env.example`):

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Long random string |
| `PORT` | Auto | Railway sets this |
| `FRONTEND_URL` | Yes | Your Vercel URL, e.g. `https://app.insidr.io` |
| `STRIPE_SECRET_KEY` | Billing | Test or live |
| `STRIPE_WEBHOOK_SECRET` | Billing | From Stripe webhook endpoint |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Billing | Also set on Vercel |
| `ANTHROPIC_API_KEY` | Ideas/AI | Claude for trade ideas |
| `ADMIN_EMAILS` | Admin | Comma-separated super-admin emails |
| `REDIS_URL` | Optional | Cache + realtime |
| `RESEND_API_KEY` | Optional | Email alerts |

4. Deploy. Confirm health: `GET https://your-api.up.railway.app/api/v1/trader/ping` → `{ "ok": true }`.

### Stripe webhooks

In Stripe Dashboard → Developers → Webhooks:

- **Endpoint URL:** `https://your-api.up.railway.app/api/v1/billing/webhook`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- Copy signing secret → `STRIPE_WEBHOOK_SECRET`

---

## 3. Frontend on Vercel

1. Import repo, framework preset **Vite**.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Environment variables:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://your-api.up.railway.app/api/v1` |

5. `vercel.json` already rewrites SPA routes to `index.html`.

### PWA

- `public/manifest.webmanifest` and `public/sw.js` ship with the static build.
- Service worker registers in production only (`import.meta.env.PROD`).
- Users can “Install app” from Chrome/Edge after visiting the live site.

---

## 4. Post-deploy checklist

- [ ] Register/login works against production API
- [ ] Stripe checkout redirects to `FRONTEND_URL/dashboard?checkout=success`
- [ ] Webhook delivers subscription updates (check Railway logs)
- [ ] Admin login at `/admin/login` for emails in `ADMIN_EMAILS`
- [ ] CORS: API allows `FRONTEND_URL` (configured in `server/index.js`)
- [ ] Optional: Upstash Redis for cache and Socket.IO scaling

---

## Local development

```bash
cp .env.example .env
# Edit DATABASE_URL, keys, PORT (e.g. 3003)
npm run dev:all
```

Vite proxies `/api` to the API origin derived from `VITE_API_URL`.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 404 on `/trader/watchlist` | Stale API process — restart `npm run dev:all` |
| Outdated API banner | Hard refresh; confirm `VITE_API_URL` matches running API port |
| Stripe webhook 400 | Wrong `STRIPE_WEBHOOK_SECRET` or raw body middleware order |
| CORS errors | Set `FRONTEND_URL` on API to exact Vercel origin (no trailing slash) |
