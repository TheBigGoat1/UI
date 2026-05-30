import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pg from "pg";
import { generateIdeas } from "../services/ideaEngine.js";
import {
  buildCalendarRange,
  defaultSyncRange,
} from "../services/economicCalendar.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:2014@localhost:5432/insidr";

async function seedCalendar(client) {
  const { from, to } = defaultSyncRange();
  const events = await buildCalendarRange(from, to);
  let n = 0;
  for (const ev of events) {
    const r = await client.query(
      `INSERT INTO economic_events (provider_event_id, country, event, impact, forecast, previous, event_time)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (provider_event_id) DO UPDATE SET event_time = EXCLUDED.event_time`,
      [
        ev.provider_event_id,
        ev.country,
        ev.event,
        ev.impact,
        ev.forecast,
        ev.previous,
        ev.event_time,
      ],
    );
    if (r.rowCount) n += 1;
  }
  console.log(`Calendar: synced ${n} events (${from.getUTCFullYear()}–${to.getUTCFullYear()})`);
}

async function main() {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  await seedCalendar(client);
  await client.end();

  const ideas = await generateIdeas(null);
  console.log(`Generated ${ideas.length} trade ideas`);
  console.log("Dashboard seed complete.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
