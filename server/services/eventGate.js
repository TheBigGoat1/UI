import { query } from "../db.js";
import { macroScopeForSymbol } from "../utils/symbolMacro.js";

const HIGH_IMPACT = new Set(["high", "3", "red"]);

function impactRank(impact) {
  const v = String(impact || "").toLowerCase();
  if (HIGH_IMPACT.has(v) || v.includes("high")) return 3;
  if (v.includes("medium") || v === "2") return 2;
  return 1;
}

/**
 * Upcoming macro events for symbol currencies.
 * @param {string} symbol
 * @param {number} windowMinutes — look ahead
 */
export async function getEventGateForSymbol(symbol, windowMinutes = 45) {
  const scope = macroScopeForSymbol(symbol);
  const now = new Date();
  const until = new Date(now.getTime() + windowMinutes * 60 * 1000);

  let rows = [];
  try {
    const { rows: r } = await query(
      `SELECT country, event, impact, event_time
       FROM economic_events
       WHERE event_time >= $1 AND event_time <= $2
       ORDER BY event_time ASC
       LIMIT 40`,
      [now.toISOString(), until.toISOString()],
    );
    rows = r;
  } catch {
    return { blocked: false, warning: false, minutesUntil: null, nextEvent: null };
  }

  const relevant = rows.filter((ev) => {
    const country = String(ev.country || "").toUpperCase();
    return scope.countries.some(
      (c) => c === country || c === "Global" || (c === "US" && country === "US"),
    );
  });

  const high = relevant.filter((ev) => impactRank(ev.impact) >= 3);
  if (!high.length) {
    return { blocked: false, warning: false, minutesUntil: null, nextEvent: null };
  }

  const next = high[0];
  const mins = Math.max(
    0,
    Math.round((new Date(next.event_time).getTime() - now.getTime()) / 60000),
  );

  return {
    blocked: mins <= 15,
    warning: mins <= windowMinutes,
    minutesUntil: mins,
    eventCount: high.length,
    nextEvent: {
      name: next.event,
      country: next.country,
      impact: next.impact,
      event_time: next.event_time,
    },
  };
}

/**
 * Next high-impact macro events globally (Calendar / overview banner).
 */
export async function getUpcomingHighImpactGate(windowMinutes = 45) {
  const now = new Date();
  const until = new Date(now.getTime() + windowMinutes * 60 * 1000);

  let rows = [];
  try {
    const { rows: r } = await query(
      `SELECT country, event, impact, event_time
       FROM economic_events
       WHERE event_time >= $1 AND event_time <= $2
       ORDER BY event_time ASC
       LIMIT 40`,
      [now.toISOString(), until.toISOString()],
    );
    rows = r;
  } catch {
    return { blocked: false, warning: false, minutesUntil: null, nextEvent: null, eventCount: 0 };
  }

  const high = rows.filter((ev) => impactRank(ev.impact) >= 3);
  if (!high.length) {
    return { blocked: false, warning: false, minutesUntil: null, nextEvent: null, eventCount: 0 };
  }

  const next = high[0];
  const mins = Math.max(
    0,
    Math.round((new Date(next.event_time).getTime() - now.getTime()) / 60000),
  );

  return {
    blocked: mins <= 15,
    warning: mins <= windowMinutes,
    minutesUntil: mins,
    eventCount: high.length,
    nextEvent: {
      name: next.event,
      country: next.country,
      impact: next.impact,
      event_time: next.event_time,
    },
  };
}
