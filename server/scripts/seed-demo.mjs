import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:2014@localhost:5432/insidr";

const client = new pg.Client({ connectionString: databaseUrl });

async function main() {
  await client.connect();
  const hash = await bcrypt.hash("demo1234", 10);

  await client.query(
    `INSERT INTO users (email, password_hash, full_name, setup_complete, tier, subscription_status)
     VALUES ($1, $2, 'Demo Trader', true, 'pro', 'active')
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       tier = 'pro',
       subscription_status = 'active',
       setup_complete = true`,
    ["demo@insidr.local", hash],
  );

  const userRes = await client.query(
    `SELECT id FROM users WHERE email = $1`,
    ["demo@insidr.local"],
  );
  const userId = userRes.rows[0]?.id;
  if (userId) {
    const sample = [
      { symbol: "EURUSD", side: "long", pnl: 120, strategy: "Breakout", emotion: "Calm", status: "WIN" },
      { symbol: "XAUUSD", side: "short", pnl: -45, strategy: "Reversal", emotion: "FOMO", status: "LOSS" },
      { symbol: "BTCUSD", side: "long", pnl: 280, strategy: "Trend", emotion: "Calm", status: "WIN" },
      { symbol: "GBPUSD", side: "long", pnl: 65, strategy: "London open", emotion: "Calm", status: "WIN" },
      { symbol: "USDJPY", side: "short", pnl: -30, strategy: "News fade", emotion: "Anxious", status: "LOSS" },
    ];
    for (const t of sample) {
      await client.query(
        `INSERT INTO trades (user_id, symbol, side, pnl, r_multiple, strategy, emotion, status, opened_at)
         SELECT $1,$2,$3,$4,$5,$6,$7,$8,NOW() - ($9 || ' days')::interval
         WHERE NOT EXISTS (
           SELECT 1 FROM trades WHERE user_id = $1 AND symbol = $2 AND strategy = $6
         )`,
        [userId, t.symbol, t.side, t.pnl, t.pnl / 50, t.strategy, t.emotion, t.status, String(Math.floor(Math.random() * 14))],
      );
    }
    console.log("Sample journal trades seeded (if missing)");
  }

  console.log("Demo user ready: demo@insidr.local / demo1234");
  await client.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
