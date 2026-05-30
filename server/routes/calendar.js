import { Router } from "express";
import { query } from "../db.js";
import {
  buildCalendarRange,
  defaultSyncRange,
  COUNTRY_META,
} from "../services/economicCalendar.js";

const router = Router();

let calendarTableReady = false;

async function ensureCalendarTable() {
  if (calendarTableReady) return true;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS economic_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_event_id TEXT UNIQUE,
        country TEXT,
        event TEXT NOT NULL,
        impact TEXT,
        actual TEXT,
        forecast TEXT,
        previous TEXT,
        event_time TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await query(
      `CREATE INDEX IF NOT EXISTS idx_economic_events_time ON economic_events(event_time ASC)`,
    );
    calendarTableReady = true;
    return true;
  } catch (err) {
    console.warn("[calendar] ensure table:", err.message);
    return false;
  }
}

function parseDateParam(value, endOfDay = false) {
  if (!value) return null;
  const d = new Date(endOfDay ? `${value}T23:59:59.999Z` : `${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthBounds(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!y || !m || m < 1 || m > 12) return null;
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  return { from, to };
}

function mapRow(row) {
  const meta = COUNTRY_META[row.country] || {};
  return {
    id: row.id,
    country: row.country,
    event_name: row.event_name || row.event,
    importance: row.importance || row.impact,
    actual: row.actual,
    forecast: row.forecast,
    previous: row.previous,
    event_time: row.event_time,
    description:
      row.description ||
      `${row.event_name || row.event} — ${meta.label || row.country} macro release.`,
    analyst_note:
      row.analyst_note ||
      `Scheduled ${new Date(row.event_time).toLocaleString("en-US", { timeZone: "UTC" })} UTC. Monitor ${row.country} FX and index volatility.`,
    currency: row.currency || meta.currency || null,
  };
}

async function upsertEvents(events) {
  const ok = await ensureCalendarTable();
  if (!ok) return 0;
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

router.get("/events", async (req, res) => {
  try {
    await ensureCalendarTable();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));

    let from = parseDateParam(req.query.from);
    let to = parseDateParam(req.query.to, true);

    if (req.query.year && req.query.month) {
      const bounds = monthBounds(req.query.year, req.query.month);
      if (bounds) {
        from = bounds.from;
        to = bounds.to;
      }
    } else if (req.query.year && !from && !to) {
      const y = Number(req.query.year);
      from = new Date(Date.UTC(y, 0, 1));
      to = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
    }

    if (!from || !to) {
      const now = new Date();
      from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    }

    const filters = ["event_time >= $1", "event_time <= $2"];
    const params = [from, to];
    let idx = 3;

    if (req.query.country && req.query.country !== "ALL") {
      filters.push(`country = $${idx++}`);
      params.push(String(req.query.country).toUpperCase());
    }
    if (req.query.importance && req.query.importance !== "ALL") {
      filters.push(`impact = $${idx++}`);
      params.push(String(req.query.importance).toUpperCase());
    }
    if (req.query.q) {
      filters.push(`event ILIKE $${idx++}`);
      params.push(`%${req.query.q}%`);
    }

    const where = `WHERE ${filters.join(" AND ")}`;

    const countRes = await query(
      `SELECT COUNT(*)::int AS total FROM economic_events ${where}`,
      params,
    );
    const total = countRes.rows[0]?.total || 0;

    let { rows } = await query(
      `SELECT id, country, event AS event_name, impact AS importance,
              actual, forecast, previous, event_time, event AS description
       FROM economic_events
       ${where}
       ORDER BY event_time ASC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, (page - 1) * limit],
    );

    if (total === 0 && page === 1) {
      const built = await buildCalendarRange(from, to);
      if (built.length) {
        await upsertEvents(built);
        const reload = await query(
          `SELECT id, country, event AS event_name, impact AS importance,
                  actual, forecast, previous, event_time, event AS description
           FROM economic_events
           ${where}
           ORDER BY event_time ASC
           LIMIT $${idx} OFFSET $${idx + 1}`,
          [...params, limit, 0],
        );
        rows = reload.rows;
      }
    }

    const countAfter = rows.length
      ? (
          await query(`SELECT COUNT(*)::int AS total FROM economic_events ${where}`, params)
        ).rows[0]?.total
      : total;

    res.json({
      success: true,
      data: rows.map(mapRow),
      meta: {
        total: countAfter,
        page,
        limit,
        from: from.toISOString(),
        to: to.toISOString(),
        year: from.getUTCFullYear(),
        month: from.getUTCMonth() + 1,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/** Day-level counts for month grid / year heatmap */
router.get("/events/summary", async (req, res) => {
  try {
    await ensureCalendarTable();
    const year = Number(req.query.year) || new Date().getUTCFullYear();
    const from = new Date(Date.UTC(year, 0, 1));
    const to = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    let { rows } = await query(
      `SELECT
         DATE(event_time AT TIME ZONE 'UTC') AS day,
         COUNT(*)::int AS count,
         COUNT(*) FILTER (WHERE impact = 'HIGH')::int AS high_count
       FROM economic_events
       WHERE event_time >= $1 AND event_time <= $2
       GROUP BY day
       ORDER BY day ASC`,
      [from, to],
    );

    if (!rows.length) {
      const built = await buildCalendarRange(from, to);
      if (built.length) await upsertEvents(built);
      const reload = await query(
        `SELECT
           DATE(event_time AT TIME ZONE 'UTC') AS day,
           COUNT(*)::int AS count,
           COUNT(*) FILTER (WHERE impact = 'HIGH')::int AS high_count
         FROM economic_events
         WHERE event_time >= $1 AND event_time <= $2
         GROUP BY day
         ORDER BY day ASC`,
        [from, to],
      );
      rows = reload.rows;
    }

    const byMonth = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      count: 0,
      high_count: 0,
    }));

    for (const row of rows) {
      const m = new Date(row.day).getUTCMonth();
      byMonth[m].count += row.count;
      byMonth[m].high_count += row.high_count;
    }

    res.json({
      success: true,
      data: {
        year,
        days: rows.map((r) => ({
          day: r.day,
          count: r.count,
          high_count: r.high_count,
        })),
        months: byMonth,
        total: rows.reduce((s, r) => s + r.count, 0),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/events/years", async (_req, res) => {
  try {
    await ensureCalendarTable();
    const { rows } = await query(
      `SELECT
         MIN(EXTRACT(YEAR FROM event_time))::int AS min_year,
         MAX(EXTRACT(YEAR FROM event_time))::int AS max_year,
         COUNT(*)::int AS total
       FROM economic_events`,
    );

    const now = new Date().getUTCFullYear();
    let minYear = rows[0]?.min_year || now - 1;
    let maxYear = rows[0]?.max_year || now + 1;

    if (!rows[0]?.total) {
      const { from, to } = defaultSyncRange();
      const built = await buildCalendarRange(from, to);
      if (built.length) {
        await upsertEvents(built);
        minYear = from.getUTCFullYear();
        maxYear = to.getUTCFullYear();
      }
    }

    const years = [];
    for (let y = minYear; y <= maxYear; y++) years.push(y);

    res.json({
      success: true,
      data: { years, minYear, maxYear, total: rows[0]?.total || 0 },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/sync", async (req, res) => {
  try {
    const { from, to } = defaultSyncRange();
    const fromParam = parseDateParam(req.body?.from) || from;
    const toParam = parseDateParam(req.body?.to, true) || to;

    const built = await buildCalendarRange(fromParam, toParam);
    const upserted = await upsertEvents(built);

    res.json({
      success: true,
      data: {
        synced: upserted,
        generated: built.length,
        from: fromParam.toISOString().slice(0, 10),
        to: toParam.toISOString().slice(0, 10),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/events/asset/:symbol", async (req, res) => {
  try {
    await ensureCalendarTable();
  const symbol = String(req.params.symbol).toUpperCase();
  const countryMap = {
    EURUSD: "EU",
    GBPUSD: "GB",
    USDJPY: "JP",
    USDCHF: "CH",
    AUDUSD: "AU",
    USDCAD: "CA",
    NZDUSD: "NZ",
    XAUUSD: "US",
    BTCUSD: "US",
    ETHUSD: "US",
  };
  const country = countryMap[symbol] || "US";

  const now = new Date();
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  let { rows } = await query(
    `SELECT id, country, event AS event_name, impact AS importance,
            actual, forecast, previous, event_time
     FROM economic_events
     WHERE country = $1 AND event_time >= $2 AND event_time <= $3
     ORDER BY event_time ASC
     LIMIT 100`,
    [country, from, to],
  );

  if (!rows.length) {
    const built = await buildCalendarRange(from, to);
    const filtered = built.filter((e) => e.country === country);
    if (filtered.length) {
      await upsertEvents(filtered);
      const reload = await query(
        `SELECT id, country, event AS event_name, impact AS importance,
                actual, forecast, previous, event_time
         FROM economic_events
         WHERE country = $1 AND event_time >= $2 AND event_time <= $3
         ORDER BY event_time ASC
         LIMIT 100`,
        [country, from, to],
      );
      rows = reload.rows;
    }
  }

  res.json({ success: true, data: rows.map(mapRow) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/countries", (_req, res) => {
  res.json({
    success: true,
    data: Object.entries(COUNTRY_META).map(([code, meta]) => ({
      code,
      ...meta,
    })),
  });
});

export default router;
