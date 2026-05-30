import { query } from "../db.js";
import {
  buildCalendarRange,
  defaultSyncRange,
} from "./economicCalendar.js";
import { ensureMacroTables } from "./macroPipeline.js";

let bootstrapPromise = null;

async function upsertEvents(events) {
  let upserted = 0;
  for (const ev of events) {
    const result = await query(
      `INSERT INTO economic_events (
         provider_event_id, country, event, impact, actual, forecast, previous, event_time
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (provider_event_id) DO UPDATE SET
         country = EXCLUDED.country,
         event = EXCLUDED.event,
         impact = EXCLUDED.impact,
         actual = COALESCE(EXCLUDED.actual, economic_events.actual),
         forecast = COALESCE(EXCLUDED.forecast, economic_events.forecast),
         previous = COALESCE(EXCLUDED.previous, economic_events.previous),
         event_time = EXCLUDED.event_time`,
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
    if (result.rowCount) upserted += 1;
  }
  return upserted;
}

/**
 * Ensure economic_events has macro data for economy intelligence (idempotent).
 */
export async function ensureMacroDataReady(force = false) {
  if (bootstrapPromise && !force) return bootstrapPromise;

  bootstrapPromise = (async () => {
    await ensureMacroTables();
    await query(
      `CREATE INDEX IF NOT EXISTS idx_economic_events_country_time
       ON economic_events(country, event_time ASC)`,
    );

    const { rows } = await query(
      `SELECT COUNT(*)::int AS n FROM economic_events
       WHERE event_time >= NOW() - INTERVAL '30 days'
         AND event_time <= NOW() + INTERVAL '60 days'`,
    );
    const count = rows[0]?.n ?? 0;

    if (!force && count >= 80) {
      return { synced: 0, total: count, skipped: true };
    }

    const { from, to } = defaultSyncRange();
    const events = await buildCalendarRange(from, to);
    const synced = await upsertEvents(events);
    console.log(`[macro] Calendar bootstrap: ${synced} upserts (${events.length} generated)`);
    return { synced, total: events.length, skipped: false };
  })().catch((err) => {
    console.warn("[macro] bootstrap failed:", err.message);
    bootstrapPromise = null;
    return { synced: 0, error: err.message };
  });

  return bootstrapPromise;
}
