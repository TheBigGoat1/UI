import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pg from "pg";
import {
  buildCalendarRange,
  defaultSyncRange,
} from "../services/economicCalendar.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:2014@localhost:5432/insidr";

async function upsert(client, events) {
  let n = 0;
  for (const ev of events) {
    const r = await client.query(
      `INSERT INTO economic_events (
         provider_event_id, country, event, impact, actual, forecast, previous, event_time
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (provider_event_id) DO UPDATE SET
         event_time = EXCLUDED.event_time,
         forecast = COALESCE(EXCLUDED.forecast, economic_events.forecast),
         previous = COALESCE(EXCLUDED.previous, economic_events.previous)`,
      [
        ev.provider_event_id,
        ev.country,
        ev.event,
        ev.impact,
        ev.actual,
        ev.forecast,
        ev.previous,
        ev.event_time,
      ],
    );
    if (r.rowCount) n += 1;
  }
  return n;
}

async function main() {
  const { from, to } = defaultSyncRange();
  console.log(`Building calendar ${from.toISOString().slice(0, 10)} → ${to.toISOString().slice(0, 10)}…`);
  const events = await buildCalendarRange(from, to);
  console.log(`Generated ${events.length} events`);

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  const synced = await upsert(client, events);
  await client.end();

  console.log(`Upserted ${synced} rows. Done.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
