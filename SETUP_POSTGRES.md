# PostgreSQL Setup (Local)

## 1) Prerequisites

- PostgreSQL installed and running on Windows
- Default port: `5432`
- Your DB user password (you provided): set in `.env` only

## 2) Configure `.env`

Copy `.env.example` to `.env` if needed, then set:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/insidr
PORT=3001
JWT_SECRET=your-long-random-secret
VITE_API_URL=http://localhost:3001/api/v1
```

Change `postgres` username or database name if your install differs.

## 3) Create database + tables

From project root:

```bash
npm install
npm run db:setup
npm run db:seed
```

This creates database `insidr` and applies `database/schema.local.sql`.

## 4) Run app + API

Terminal 1:

```bash
npm run server
```

Terminal 2:

```bash
npm run dev
```

Or one command:

```bash
npm run dev:all
```

## 5) Verify

Open:

- Frontend: `http://localhost:5173`
- API health: `http://localhost:3001/api/v1/health`

You should see `"database": "postgres"` in the health response.

## Security note

Never commit `.env` or share DB passwords in chat/repos. Rotate password `2014` if it was exposed.
