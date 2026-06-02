/**
 * Central bank rate paths & decision rows — live Yahoo yields + economic calendar.
 */

import { query } from "../db.js";
import { cached } from "./cache.js";
import { fetchYahooHistorySeries } from "./marketData.js";
import { buildCalendarRange, COUNTRY_META } from "./economicCalendar.js";

export const RATE_DECISION_PATTERN =
  /fomc|fed funds|fed rate|interest rate decision|official bank rate|main refinancing|deposit facility|policy rate|cash rate|ocr|monetary policy|boj|boe|ecb|boc|rba|rbnz|pboc|rate decision|rate statement/i;

const CB_YAHOO_YIELDS = {
  US: {
    symbols: ["^IRX", "^FVX"],
    label: "US front-end yield (3-month T-Bill / 5Y Treasury)",
    source: "yahoo",
  },
  EU: {
    symbols: ["^FVX", "^TNX"],
    label: "Euro area — sovereign yield reference (5Y / 10Y Treasury proxy)",
    source: "yahoo",
  },
  GB: {
    symbols: ["^FVX", "^TNX"],
    label: "UK — gilt yield reference (US curve proxy until wired)",
    source: "yahoo",
  },
  JP: {
    symbols: ["^IRX"],
    label: "Japan — low-rate environment (US front-end reference)",
    source: "yahoo",
  },
  AU: { symbols: ["^FVX"], label: "Australia — yield reference", source: "yahoo" },
  NZ: { symbols: ["^FVX"], label: "New Zealand — yield reference", source: "yahoo" },
  CA: { symbols: ["^FVX"], label: "Canada — yield reference", source: "yahoo" },
  CN: { symbols: ["^TNX"], label: "China — long-end yield reference", source: "yahoo" },
};

function monthSample(bars, maxPoints = 24) {
  if (!bars?.length) return [];
  if (bars.length <= maxPoints) {
    return bars.map((b) => ({
      label: new Date(b.time * 1000).toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
      value: Number(Number(b.close).toFixed(3)),
    }));
  }
  const step = Math.floor(bars.length / maxPoints);
  const out = [];
  for (let i = 0; i < bars.length; i += step) {
    const b = bars[i];
    out.push({
      label: new Date(b.time * 1000).toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
      value: Number(Number(b.close).toFixed(3)),
    });
  }
  const last = bars[bars.length - 1];
  if (out[out.length - 1]?.value !== last.close) {
    out.push({
      label: new Date(last.time * 1000).toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
      value: Number(Number(last.close).toFixed(3)),
    });
  }
  return out.slice(-maxPoints);
}

export function parseRateValue(raw) {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  const n = parseFloat(s.replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n)) return null;
  if (s.includes("%") || n > 0.5) return Number(n.toFixed(3));
  return Number((n * 100).toFixed(3));
}

export function isRateDecisionEvent(name) {
  const t = String(name || "");
  if (!t) return false;
  if (/pmi|gdp|cpi|nfp|jobless|retail|confidence|sentiment|trade balance|housing/i.test(t)) return false;
  if (/press conference|minutes|speech|testimony/i.test(t) && !/rate|fomc|bank rate|policy rate|refinancing|ocr|decision/i.test(t)) {
    return false;
  }
  return RATE_DECISION_PATTERN.test(t);
}

async function ensureCalendarRows(from, to) {
  try {
    const count = await query(
      `SELECT COUNT(*)::int AS n FROM economic_events WHERE event_time >= $1 AND event_time <= $2`,
      [from.toISOString(), to.toISOString()],
    );
    if ((count.rows[0]?.n || 0) > 0) return;
    const built = await buildCalendarRange(from, to);
    if (!built.length) return;
    for (const ev of built) {
      await query(
        `INSERT INTO economic_events (
           provider_event_id, country, event, impact, actual, forecast, previous, event_time
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (provider_event_id) DO UPDATE SET
           event = EXCLUDED.event,
           impact = EXCLUDED.impact,
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
    }
  } catch {
    /* DB optional in dev */
  }
}

async function fetchYahooSeriesWithFallback(symbols = []) {
  for (const sym of symbols) {
    try {
      const bars = await fetchYahooHistorySeries(sym, "1day", "5y");
      if (bars.length >= 4) {
        let values = bars;
        if (sym === "ZQ=F") {
          values = bars.map((b) => ({ ...b, close: 100 - b.close }));
        }
        return { bars: values, symbol: sym };
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

async function rateSeriesFromCalendar(country) {
  const code = String(country).toUpperCase();
  try {
    const res = await query(
      `SELECT event, event_time, previous, forecast, actual
       FROM economic_events
       WHERE country = $1
         AND event_time >= NOW() - INTERVAL '5 years'
         AND event_time <= NOW() + INTERVAL '120 days'
       ORDER BY event_time ASC
       LIMIT 400`,
      [code],
    );
    let rows = res.rows || [];
    if (rows.length < 2) {
      const now = new Date();
      const from = new Date(now.getTime() - 3 * 365 * 24 * 60 * 60 * 1000);
      const to = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);
      const built = await buildCalendarRange(from, to).catch(() => []);
      rows = built
        .filter((ev) => String(ev.country).toUpperCase() === code)
        .map((ev) => ({
          event: ev.event,
          event_time: ev.event_time,
          previous: ev.previous,
          forecast: ev.forecast,
          actual: ev.actual,
        }));
    }
    const points = rows
      .filter((r) => isRateDecisionEvent(r.event))
      .map((r) => {
        const value =
          parseRateValue(r.actual) ?? parseRateValue(r.forecast) ?? parseRateValue(r.previous);
        if (value == null) return null;
        return {
          label: new Date(r.event_time).toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
          value,
          event: r.event,
          event_time: r.event_time,
        };
      })
      .filter(Boolean);
    if (points.length < 1) return null;
    const series =
      points.length === 1
        ? [
            { label: points[0].label, value: points[0].value },
            { label: "Current", value: points[0].value },
          ]
        : points.slice(-20).map(({ label, value }) => ({ label, value }));
    const latest = series[series.length - 1].value;
    return {
      asOf: new Date().toISOString(),
      series,
      latestRate: latest,
      source: "economic_calendar",
      label: `${COUNTRY_META[code]?.label || code} policy rate (calendar releases)`,
      country: code,
    };
  } catch {
    return null;
  }
}

export async function getCentralBankRateSeries(country = "US") {
  const code = String(country || "US").toUpperCase();
  const cacheKey = `desk:cb-series:${code}`;
  return cached(cacheKey, 300000, async () => {
    const cfg = CB_YAHOO_YIELDS[code] || CB_YAHOO_YIELDS.US;

    const fromCal = await rateSeriesFromCalendar(code);

    const yahoo = await fetchYahooSeriesWithFallback(cfg.symbols);
    if (yahoo?.bars?.length) {
      const points = monthSample(yahoo.bars, 20);
      const latest = yahoo.bars[yahoo.bars.length - 1].close;
      return {
        asOf: new Date().toISOString(),
        series: points,
        latestRate: Number(Number(latest).toFixed(3)),
        source: `yahoo:${yahoo.symbol}`,
        label: cfg.label,
        country: code,
      };
    }

    if (fromCal) return fromCal;

    return {
      asOf: new Date().toISOString(),
      series: [],
      latestRate: null,
      source: "unavailable",
      label: cfg.label,
      country: code,
    };
  });
}

function mapDecisionRow(r) {
  const country = String(r.country || "").toUpperCase();
  const meta = COUNTRY_META[country] || {};
  let trend = [];
  const prev = parseRateValue(r.previous);
  const fcst = parseRateValue(r.forecast);
  const act = parseRateValue(r.actual);
  if (prev != null && fcst != null) trend = [prev, (prev + fcst) / 2, fcst];
  else if (prev != null && act != null) trend = [prev, (prev + act) / 2, act];

  return {
    id: r.id,
    decision: r.event || r.event_name,
    country,
    currency: meta.currency || country,
    date: new Date(r.event_time).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    event_time: r.event_time,
    outcome: r.forecast ? String(r.forecast) : r.actual ? String(r.actual) : "—",
    previous: r.previous ?? "—",
    impact: r.impact || r.importance,
    trend,
    source: "economic_calendar",
  };
}

export async function getRateDecisionRows(country = null) {
  const now = new Date();
  const to = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);
  const from = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  await ensureCalendarRows(from, to);

  let rows = [];
  try {
    const params = [now.toISOString(), to.toISOString()];
    let sql = `SELECT id, country, event, impact, event_time, forecast, previous, actual
               FROM economic_events
               WHERE event_time >= $1 AND event_time <= $2`;
    if (country) {
      sql += ` AND country = $3`;
      params.push(String(country).toUpperCase());
    }
    sql += ` ORDER BY event_time ASC LIMIT 400`;
    const res = await query(sql, params);
    rows = res.rows || [];
  } catch {
    return { asOf: new Date().toISOString(), rows: [], source: "unavailable" };
  }

  if (!rows.length) {
    const built = await buildCalendarRange(now, to);
    rows = built.map((ev, i) => ({
      id: ev.provider_event_id || `gen-${i}`,
      country: ev.country,
      event: ev.event,
      impact: ev.impact,
      event_time: ev.event_time,
      forecast: ev.forecast,
      previous: ev.previous,
      actual: ev.actual,
    }));
  }

  const filtered = rows
    .filter((r) => isRateDecisionEvent(r.event))
    .slice(0, 16)
    .map(mapDecisionRow);

  return {
    asOf: new Date().toISOString(),
    rows: filtered,
    source: filtered.length ? "economic_calendar" : "empty",
  };
}

export function stanceFromRateSeries(seriesBundle) {
  const pts = seriesBundle?.series || [];
  if (pts.length < 3) return { label: "Awaiting data", tone: "neutral" };
  const recent = pts.slice(-4).map((p) => p.value);
  const delta = recent[recent.length - 1] - recent[0];
  if (delta >= 0.15) return { label: "Hawkish tilt", tone: "hawk" };
  if (delta <= -0.15) return { label: "Dovish tilt", tone: "dove" };
  if (Math.abs(delta) >= 0.05) return { label: delta > 0 ? "Neutral to Hawkish" : "Neutral to Dovish", tone: delta > 0 ? "hawk" : "dove" };
  return { label: "Stable / on hold", tone: "neutral" };
}

/** @deprecated use getCentralBankRateSeries('US') */
export async function getFedPolicySeries() {
  return getCentralBankRateSeries("US");
}
