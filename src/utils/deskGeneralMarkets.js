/** Copy & ordering helpers for General Markets desk */

import { getPriceRow } from './newsAssets.js';
import {
  computeLiveSentiment,
  computeScheduleRiskFromEvents,
  resolveLiveCapitalFlows,
  scheduleRiskUnavailable,
} from './deskLiveCompute.js';
import { pctFromPriceRow } from './sectorFlowModel.js';

/** MRKT safe-haven tab order */
export const SAFE_HAVEN_ORDER = ['FXY', 'FXF', 'GLD', 'TLT', 'XLU', 'XLV', 'XLP'];

const HAVEN_TICKERS = new Set(SAFE_HAVEN_ORDER);

/** MRKT reference display order for sector ETF flow rows */
export const CAPITAL_FLOW_ORDER = [
  'XLK',
  'XLE',
  'QQQ',
  'SPY',
  'VTI',
  'DIA',
  'XLF',
  'IWM',
  'XLI',
  'XLRE',
  'XLV',
  'XLP',
  'XLU',
];

export const MACRO_STRIP_SYMBOLS = ['ESUSD', 'NQUSD', 'XAUUSD', 'EURUSD', 'CLUSD', 'DXY'];

function sessionPct(prices, symbol) {
  return pctFromPriceRow(prices, symbol);
}

function fmtPct(n) {
  if (!Number.isFinite(n)) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

export function buildCapitalFlowsFromPrices(prices = {}) {
  return resolveLiveCapitalFlows([], prices);
}

export function buildClientSentiment(prices = {}, brief = null) {
  return computeLiveSentiment(prices, brief);
}

export function buildClientScheduleRisk() {
  return scheduleRiskUnavailable();
}

export function mapCalendarApiEvents(rows = [], limit = 8) {
  const now = Date.now();
  return (rows || [])
    .filter((ev) => new Date(ev.event_time).getTime() >= now - 60000)
    .sort((a, b) => new Date(a.event_time) - new Date(b.event_time))
    .slice(0, limit)
    .map((ev) => ({
      title: ev.event_name || ev.event,
      time: `${new Date(ev.event_time).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      })} UTC`,
      date: new Date(ev.event_time).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      event_time: ev.event_time,
      impact: ev.importance || ev.impact,
      country: ev.country,
    }));
}

export function upcomingReleasesHeaderDate(events = []) {
  const first = events?.[0];
  if (first?.event_time) {
    try {
      return new Date(first.event_time).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      /* fall through */
    }
  }
  return new Date().toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Merge API desk bundle with live client computations.
 * Sentiment + capital flows always recompute from latest prices on every tick.
 */
export function mergeGeneralMarketsDesk(deskData, prices = {}, brief = null, calendarEvents = []) {
  const liveSentiment = computeLiveSentiment(prices, brief || deskData?.brief);
  const apiFlows = deskData?.capitalFlows?.flows || [];
  const liveFlows = resolveLiveCapitalFlows(apiFlows, prices);

  const apiSchedule = deskData?.scheduleRisk;
  const calendarSchedule =
    calendarEvents?.length > 0 ? computeScheduleRiskFromEvents(calendarEvents) : null;
  const scheduleRisk =
    apiSchedule?.score != null && apiSchedule?.source !== 'fallback'
      ? apiSchedule
      : calendarSchedule || apiSchedule || scheduleRiskUnavailable();

  if (!deskData) {
    return {
      sentiment: liveSentiment,
      scheduleRisk,
      capitalFlows: liveFlows,
      source: liveFlows.source,
      live: liveSentiment.live || liveFlows.live,
    };
  }

  const apiSentiment = deskData.sentiment;

  return {
    sentiment: {
      ...apiSentiment,
      ...liveSentiment,
      summary: liveSentiment.summary,
      factors: liveSentiment.factors,
      score: liveSentiment.score,
      label: liveSentiment.label,
      regimeLabel: liveSentiment.regimeLabel,
      asOf: liveSentiment.asOf,
      live: liveSentiment.live,
    },
    scheduleRisk,
    capitalFlows: {
      ...(deskData.capitalFlows || {}),
      flows: liveFlows.flows,
      source: liveFlows.source,
      live: liveFlows.live,
      stale: liveFlows.stale,
      asOf: liveFlows.asOf,
    },
    source: liveFlows.source,
    live: liveSentiment.live || liveFlows.live,
  };
}

export function riskRingStroke(score) {
  const s = Number(score);
  if (!Number.isFinite(s)) return '#64748b';
  if (s >= 70) return '#22c55e';
  if (s >= 45) return '#eab308';
  return '#ef4444';
}

export function formatMacroChip(symbol, prices, vix) {
  if (symbol === 'VIX') {
    return vix != null ? Number(vix).toFixed(1) : '—';
  }
  return fmtPct(sessionPct(prices, symbol));
}

const SECTOR_NOUN = {
  XLK: 'tech and semis',
  QQQ: 'growth',
  XLE: 'energy',
  XLF: 'financials',
  XLI: 'industrials',
  XLV: 'healthcare',
  XLP: 'consumer staples',
  XLU: 'utilities',
  XLRE: 'real estate',
  SPY: 'broad equities',
  VTI: 'total market',
  DIA: 'blue chips',
  IWM: 'small caps',
};

function names(flows, n = 2) {
  return flows
    .slice(0, n)
    .map((f) => SECTOR_NOUN[f.ticker] || f.name?.split(' ')[0]?.toLowerCase() || f.ticker)
    .join(' and ');
}

export function truncateLabel(text, max = 17) {
  const s = String(text || '').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max).trim()}…`;
}

export function buildCapitalFlowNarrative(flows, mode = 'liquidity') {
  if (!flows?.length) return null;

  const sorted = [...flows].sort((a, b) => b.pct - a.pct);
  const inflow = sorted.filter((f) => f.pct > 0.02);
  const outflow = sorted.filter((f) => f.pct < -0.02);

  if (!inflow.length && !outflow.length) {
    return 'Session tape is flat — sector flows will update as ES, NQ, and CL move.';
  }

  if (mode === 'haven') {
    const havenRows = sorted.filter((f) => HAVEN_TICKERS.has(f.ticker));
    const havenOut = havenRows.filter((f) => f.pct < -0.02);
    const havenIn = havenRows.filter((f) => f.pct > 0.02);
    if (havenOut.length >= 2 && !havenIn.length) {
      return `Risk appetite appears elevated, with investors rotating out of gold, yen, and franc safe havens into risk assets. The declines in ${names(havenOut.slice(0, 3), 3)} suggest calmer global conditions and fading crisis demand.`;
    }
    if (havenIn.length) {
      return `Defensive bid lifts ${names(havenIn, 2)} while beta and cyclicals lag — haven ETFs are catching flows on the session tape.`;
    }
    return `Haven complex is mixed on the session; watch FXY, FXF, and GLD for confirmation of risk-on vs defensive rotation.`;
  }

  const hasTech = inflow.some((f) => f.ticker === 'XLK' || f.ticker === 'QQQ');
  const hasDefensiveOut = outflow.some((f) =>
    ['XLU', 'XLV', 'XLP', 'XLRE'].includes(f.ticker),
  );

  if (hasTech && hasDefensiveOut) {
    return 'Mega-cap tech and cyclicals are attracting flows while defensives, small caps, and gold see outflows; risk-on liquidity favors U.S. growth leadership and dumps havens.';
  }

  if (inflow.length && outflow.length) {
    return `Risk-on flows favor ${names(inflow, 2)}, while ${names(outflow, 2)} see outflows — selective accumulation with weak demand in lagging sectors.`;
  }

  if (inflow.length) {
    return `Leadership concentrated in ${names(inflow, 3)}; sector breadth is narrow but risk appetite holds.`;
  }

  return 'Flows are balanced to negative — defensives and laggards dominate the session change.';
}

export function orderCapitalFlows(flows, mode = 'liquidity') {
  const byTicker = new Map((flows || []).map((f) => [f.ticker, f]));
  const ordered = CAPITAL_FLOW_ORDER.map((t) => byTicker.get(t)).filter(Boolean);
  const extras = (flows || []).filter((f) => !CAPITAL_FLOW_ORDER.includes(f.ticker));
  return [...ordered, ...extras.sort((a, b) => b.pct - a.pct)];
}

/** Rows for active Liquidity vs Safe Haven tab */
export function getFlowsForMode(flows, mode = 'liquidity') {
  const list = flows || [];
  if (mode === 'haven') {
    const haven = list.filter((f) => HAVEN_TICKERS.has(f.ticker));
    const ordered = SAFE_HAVEN_ORDER.map((t) => haven.find((f) => f.ticker === t)).filter(Boolean);
    const extras = haven.filter((f) => !SAFE_HAVEN_ORDER.includes(f.ticker));
    return [...ordered, ...extras].sort((a, b) => b.pct - a.pct);
  }
  return orderCapitalFlows(list, 'liquidity');
}

export function formatPastEventTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
}

function inferEventVenue(ev) {
  const t = String(ev?.event_name || ev?.event || '').toLowerCase();
  if (t.includes('oval')) return 'Oval Office';
  if (t.includes('pool') && t.includes('town')) return 'In-Town Pool';
  if (t.includes('white house') || t.includes('executive') || t.includes('president')) {
    return 'The White House';
  }
  if (String(ev?.country || '').toUpperCase() === 'US') return 'Washington, DC';
  return ev?.country || null;
}

function inferEventPress(ev) {
  const t = String(ev?.event_name || ev?.event || '').toLowerCase();
  if (t.includes('pool') || t.includes('lid')) return 'In-Town Pool';
  if (t.includes('closed press')) return 'Closed Press';
  if (t.includes('press')) return 'Press';
  return null;
}

export function mapPastScheduleEvents(rows = [], limit = 6) {
  const now = Date.now();
  return (rows || [])
    .filter((ev) => ev?.event_time && new Date(ev.event_time).getTime() <= now + 120_000)
    .sort((a, b) => new Date(b.event_time) - new Date(a.event_time))
    .slice(0, limit)
    .map((ev) => {
      const title = ev.event_name || ev.event || 'Event';
      const category = eventDisplayCategory({ title, ...ev });
      const president = category.includes('President');
      const pool = String(title).toLowerCase().includes('pool');
      return {
        id: ev.id || `${ev.event_time}-${title}`,
        category,
        categoryDot: president ? 'president' : pool ? 'pool' : 'macro',
        time: formatPastEventTime(ev.event_time),
        title,
        venue: inferEventVenue(ev),
        press: inferEventPress(ev),
        event_time: ev.event_time,
      };
    });
}

export function pastEventsHeaderDate(events = []) {
  const first = events?.[0];
  if (first?.event_time) {
    try {
      return new Date(first.event_time).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      /* fall through */
    }
  }
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatScheduleTimestamp(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function formatEventsHeaderDate(events) {
  const first = events?.[0];
  if (first?.event_time) {
    try {
      return new Date(first.event_time).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      /* fall through */
    }
  }
  return new Date().toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function scheduleRiskStatement(level) {
  const l = String(level || 'Low').toUpperCase();
  return `${l} RISK BASED ON CURRENT SCHEDULE.`;
}

export function eventDisplayCategory(ev) {
  const t = String(ev?.title || '').toLowerCase();
  if (t.includes('president') || t.includes('executive') || t.includes('white house')) {
    return "President's Official Schedule";
  }
  if (t.includes('fed') || t.includes('fomc') || t.includes('cpi') || t.includes('nfp')) {
    return 'US Macro Calendar';
  }
  return ev?.category?.split('·')[0]?.trim() || 'US High-Impact Macro';
}

/** @deprecated use orderCapitalFlows */
export function sortFlowsForMode(flows, mode) {
  return orderCapitalFlows(flows, mode);
}
