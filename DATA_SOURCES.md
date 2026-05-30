# Data Sources and Free-Tier Setup

## Recommended free-first provider stack

- Market prices/ohlcv: Twelve Data (free tier key)
- Economic calendar/macro: Trading Economics (free/developer tier)
- News (global): GNews (free key)
- News (crypto): CryptoPanic (public/free, optional key)
- Auth + DB: Supabase

## Provider links

- Twelve Data: [https://twelvedata.com/](https://twelvedata.com/)
- Trading Economics: [https://developer.tradingeconomics.com/](https://developer.tradingeconomics.com/)
- GNews: [https://gnews.io/](https://gnews.io/)
- CryptoPanic API: [https://cryptopanic.com/developers/api/](https://cryptopanic.com/developers/api/)
- Supabase: [https://supabase.com/](https://supabase.com/)

## Current app behavior

- News page first tries your backend API routes
- If backend is unavailable or returns empty, it falls back to free providers:
  - GNews (when `VITE_GNEWS_API_KEY` exists)
  - CryptoPanic (works as public fallback)

## Environment variables

Add these to `.env`:

```env
VITE_API_URL=https://your-backend/api/v1
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GNEWS_API_KEY=your-gnews-key
VITE_CRYPTOPANIC_API_KEY=your-cryptopanic-key
```

## Cost-control best practices (free plans)

- Cache provider responses for 60-300 seconds
- Poll dashboards every 5-10 seconds only for prices
- Poll news every 60-120 seconds
- Store fetched news in Postgres and deduplicate by URL
