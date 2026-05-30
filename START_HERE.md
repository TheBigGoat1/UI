# START HERE — Full setup from this folder

Project folder:

```text
c:\Users\okeke\Downloads\UI-main\UI-main
```

---

## Step 1 — Open terminal in project folder

**PowerShell:**

```powershell
cd c:\Users\okeke\Downloads\UI-main\UI-main
```

---

## Step 2 — Environment file

Copy example if needed:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/insidr
JWT_SECRET=your-long-random-secret
PORT=3001
VITE_API_URL=http://localhost:3001/api/v1

# GNews (you provided this key)
GNEWS_API_KEY=537fcc53335e7fc459d967db729d3dd0
VITE_GNEWS_API_KEY=537fcc53335e7fc459d967db729d3dd0

# CryptoPanic v2 — get from https://cryptopanic.com/developers/api/ after Sign In
CRYPTOPANIC_API_KEY=YOUR_CRYPTOPANIC_AUTH_TOKEN
VITE_CRYPTOPANIC_API_KEY=YOUR_CRYPTOPANIC_AUTH_TOKEN
CRYPTOPANIC_API_PLAN=developer
VITE_CRYPTOPANIC_API_PLAN=developer
```

---

## Step 3 — Install + database

```powershell
npm install
npm run db:setup
npm run db:seed
npm run db:check
```

Expected:

- Database `insidr` exists
- Tables created (`users`, `trades`, `news_articles`, …)
- Demo user: `demo@insidr.local` / `demo1234`

---

## Step 4 — Start API + frontend

**Option A — one command:**

```powershell
npm run dev:all
```

**Option B — two terminals:**

```powershell
# Terminal 1
npm run server

# Terminal 2
npm run dev
```

Open:

- App: http://localhost:5173
- API health: http://localhost:3001/api/v1/health

---

## Step 5 — Sync news into PostgreSQL

With API running:

```powershell
npm run news:sync
```

Or in browser while logged in, open **Dashboard → News** (auto-fetches and stores).

---

## Step 6 — Verify login

1. Go to http://localhost:5173/login
2. Sign in: `demo@insidr.local` / `demo1234`
3. Open **Connections** → connect exchange → **Run Sync**
4. Open **Journal** → trades from Postgres
5. Open **News** → GNews + CryptoPanic articles

---

## All npm commands (reference)

| Command | What it does |
|---------|----------------|
| `npm install` | Install dependencies |
| `npm run db:setup` | Create DB + tables + migrations |
| `npm run db:seed` | Create demo user |
| `npm run db:check` | Test Postgres + list tables |
| `npm run server` | Start API (port 3001) |
| `npm run dev` | Start frontend (port 5173) |
| `npm run dev:all` | Start API + frontend together |
| `npm run news:sync` | Pull GNews/CryptoPanic → Postgres |
| `npm run build` | Production build |

---

## CryptoPanic v2 notes

- Base URL: `https://cryptopanic.com/api/developer/v2/posts/`
- Required: `auth_token=YOUR_KEY`
- Recommended: `public=true`, `kind=news`, `regions=en`
- Optional: `currencies=BTC,ETH`

Get token: sign in at [CryptoPanic](https://cryptopanic.com/) → Developers → API.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Database unreachable` | Start PostgreSQL service; check `DATABASE_URL` password |
| `Cannot POST /auth/login` | Restart API: `npm run server` |
| News empty | Run `npm run news:sync`; verify keys in `.env` |
| CryptoPanic 401 | Set valid `CRYPTOPANIC_API_KEY` |
| GNews errors | Verify `VITE_GNEWS_API_KEY` at [gnews.io](https://gnews.io/) |
