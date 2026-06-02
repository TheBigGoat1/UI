# MRKT Edge hybrid — functional parity & billing plan

Reference product: [app.mrktedge.ai/home](https://app.mrktedge.ai/home)

This document maps **MRKT Edge** capabilities onto the existing Insidr/MRKT codebase, removes redundancy, and defines **production lock logic** with **Stripe test mode** for end-to-end QA.

---

## 1. Feature parity matrix

| MRKT Edge surface | Our implementation | Tier | API / route |
|-------------------|-------------------|------|-------------|
| Terminal home (chart + headline + price) | `Dashboard.jsx` + `MrktTerminalHeader` | Free (basic) | `GET /market/*` |
| Icon rail navigation | `DashboardLayout` `mrktRailNav` | Free | — |
| Timeframes 1h/30m/15m/5m | `MrktChartToolbar` | Free | `GET /market/history` |
| News feed column | `MrktNewsFeed` | Free (read) | `GET /news/*` |
| Chart labels & callouts | `MrktChartOverlays` | **Pro+** | `chart.labels` |
| Target / pullback levels | `MrktChartOverlays` + TV levels | **Pro+** | `chart.targets` |
| Calendar events on chart | Toolbar toggle (future TV markers) | **Pro+** | `chart.calendar` |
| News AI brain / insight | Brain icon on cards | **Pro+** | `news.ai_insight` |
| Swing / day sentiment pills | `MrktTerminalHeader` | Free (data) | `GET /analysis/*` |
| AI chat FAB | `AIChatWidget` | Pro; Elite advanced | `chat.*` |
| Ideas / targets rail | `/dashboard/ideas` | **Pro+** | `ideas.generate` |
| Backtest | `/dashboard/backtest` | **Pro+** | `backtest.run` |
| Broker sync | `/dashboard/connections` | **Pro+** | `broker.sync` |
| Billing / trial | Stripe Checkout + Portal | Onboarding | `/billing/*` |

**Removed redundancy**

- Single entitlement source: `server/config/features.js` + `src/config/features.js`
- One news UI primitive: `MrktNewsFeed` (embedded on home; full page uses same styles)
- One chart stack: `TradeChart` → `TradingViewChart` (no duplicate OHLC-only home chart)
- Sidebar: MRKT rail on `/dashboard`; full icon rail on other routes (no duplicate text + icon nav)

---

## 2. Subscription tiers (unchanged pricing, production locks)

| Tier | Price | Trial | Locks |
|------|-------|-------|-------|
| Free | $0 | — | Terminal basic, news read, no overlays / AI |
| Pro | $28/mo · $280/yr | 7 days | Full terminal, ideas, backtest, alerts |
| Elite | $79/mo · $790/yr | 7 days | Pro + `chat.advanced` |

**Production lock logic** (`BILLING_ENFORCEMENT=production`, default):

- `hasPaidAccess()` must be true for Pro/Elite capabilities
- Trial expiry and `past_due` / `canceled` revoke access via webhooks + `syncUserSubscription`
- Frontend gates use same capability keys as API `requireCapability`

**Stripe test mode** (`BILLING_STRIPE_MODE=test` or `sk_test_*` key):

- Same locks as production (no “free unlock” in test)
- UI banner: “Test Stripe — no real charges”
- Use [Stripe test cards](https://docs.stripe.com/testing) and CLI webhooks

---

## 3. Environment (test flow)

```env
# Production-grade locks, Stripe test keys
BILLING_ENFORCEMENT=production
BILLING_STRIPE_MODE=test
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
FRONTEND_URL=http://localhost:5173

# Optional: local trial without Checkout (dev only)
ALLOW_DEV_BILLING=true
```

**Full test flow**

1. `npm run db:setup` → `npm run dev:all`
2. Register → onboarding → Stripe Checkout (`4242…` card)
3. `stripe listen --forward-to localhost:3001/api/v1/billing/webhook`
4. Confirm `/dashboard` — labels/targets unlocked
5. Portal cancel / `invoice.payment_failed` → features lock
6. Pricing → “Dev: start trial” only if `ALLOW_DEV_BILLING=true`

---

## 4. Implementation phases

### Phase A — Done in this pass

- [x] Unified `features.js` catalog (server + client)
- [x] MRKT capabilities on API middleware
- [x] `MrktFeatureGate` + `BillingTestBanner`
- [x] Dashboard toggles respect subscription
- [x] Billing health exposes `stripe_mode`, `enforcement`, `locks_enabled`
- [x] Pricing page shows test-mode + MRKT feature matrix

### Phase B — Next (chart depth)

- [ ] Pin callouts to bar timestamps (TradingView custom studies or overlay API)
- [ ] Calendar event markers from `GET /calendar`
- [ ] Session purple bands (London / NY)

### Phase C — Next (MRKT content)

- [ ] “Market recap” generated brief endpoint
- [ ] Per-headline AI insight modal (uses `news.ai_insight` + Anthropic)
- [ ] Bookmark persistence per user

### Phase D — Production

- [ ] `BILLING_STRIPE_MODE=live` + live keys only on deploy
- [ ] Webhook signing required in production
- [ ] Remove `ALLOW_DEV_BILLING` on production hosts

---

## 5. File map

| File | Role |
|------|------|
| `server/config/features.js` | Capability → tiers (source of truth) |
| `server/config/billingMode.js` | Enforcement + Stripe test/live detection |
| `server/services/subscriptionAccess.js` | Paid access + capabilities |
| `src/config/features.js` | Client mirror + UI copy |
| `src/hooks/useFeatureAccess.js` | `can(feature)` + billing status |
| `src/components/billing/MrktFeatureGate.jsx` | Inline lock UI |
| `src/components/billing/BillingTestBanner.jsx` | Test Stripe banner |
| `MRKT_HYBRID_PLAN.md` | This plan |

---

## 6. Success criteria

- Free user: sees terminal, chart, news; locked toggles show upgrade CTA
- Pro trial via **test** Checkout: all Pro features unlock; webhook updates DB
- Cancel subscription: overlays lock within one webhook/sync cycle
- No duplicate entitlement lists in codebase
- Design matches [mrktedge.ai/home](https://app.mrktedge.ai/home) layout with gated premium layers
