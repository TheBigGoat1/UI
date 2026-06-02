/**
 * Live desk computations — driven by websocket/REST prices + API snapshots.
 * No predefined sector spreads; empty/stale states when tape is flat.
 */

import {
  buildAllFlowsFromPrices,
  flowsAreFlat,
  mergeFlowRowsLive,
  pctFromPriceRow,
} from './sectorFlowModel.js';
import { pickPriceRow } from './deskSymbols.js';

const TAPE_SYMBOLS = ['ESUSD', 'NQUSD', 'XAUUSD', 'CLUSD', 'DXY', 'EURUSD'];

export function tapeIsLive(prices = {}) {
  return TAPE_SYMBOLS.some((sym) => {
    const row = pickPriceRow(prices, sym);
    if (!row || row.synthetic) return false;
    const cp = pctFromPriceRow(prices, sym);
    return Math.abs(cp) >= 0.001;
  });
}

export function resolveLiveCapitalFlows(apiFlows = [], prices = {}) {
  const tapeRows = buildAllFlowsFromPrices(prices);
  const yahooRows = (apiFlows || []).filter((r) => r?.ticker && !flowsAreFlat([r]));
  const flows = mergeFlowRowsLive(yahooRows, tapeRows);
  const live = tapeIsLive(prices);

  if (!flowsAreFlat(flows)) {
    const source =
      yahooRows.length >= 4 && !flowsAreFlat(tapeRows)
        ? 'yahoo+live_tape'
        : yahooRows.length >= 4
          ? 'yahoo'
          : 'live_tape';
    return {
      flows,
      source,
      live: true,
      asOf: new Date().toISOString(),
    };
  }

  return {
    flows,
    source: live ? 'live_tape_flat' : 'awaiting_tape',
    live: false,
    stale: !live,
    asOf: new Date().toISOString(),
  };
}

export function computeLiveSentiment(prices = {}, brief = null) {
  const regime = brief?.regime || {};
  const vix = regime.vix;
  const env = regime.environment || 'NEUTRAL';
  const nq = pctFromPriceRow(prices, 'NQUSD');
  const es = pctFromPriceRow(prices, 'ESUSD');
  const xau = pctFromPriceRow(prices, 'XAUUSD');
  const cl = pctFromPriceRow(prices, 'CLUSD');
  const dxy = pctFromPriceRow(prices, 'DXY');

  let score = 50;
  if (env === 'RISK_ON') score += 8;
  if (env === 'RISK_OFF') score -= 12;
  if (nq > 0.15) score += 5;
  if (nq < -0.15) score -= 5;
  if (es > 0.1) score += 3;
  if (es < -0.1) score -= 3;
  if (vix != null && vix > 22) score -= 10;
  if (vix != null && vix < 15) score += 6;
  if (xau > 0.2) score -= 2;
  if (cl > 0.25) score -= 2;
  score = Math.max(8, Math.min(92, Math.round(score)));

  const label = score >= 58 ? 'Cautious Optimism' : score >= 45 ? 'Balanced' : 'Defensive';
  const regimeLabel = env === 'RISK_ON' ? 'Risk-On' : env === 'RISK_OFF' ? 'Risk-Off' : 'Mixed';
  const sessionLabel = brief?.session?.label || 'New York';
  const month = new Date().toLocaleString(undefined, { month: 'long' });
  const fmt = (n) => `${n >= 0 ? '+' : ''}${Number(n).toFixed(2)}%`;

  const summary =
    regime.guidance ||
    brief?.veteranLine ||
    `Live tape: NQ ${fmt(nq)} · ES ${fmt(es)} · ${regimeLabel}${vix != null ? ` · VIX ${Number(vix).toFixed(1)}` : ''}.`;

  const volNote =
    vix != null
      ? `VIX ${Number(vix).toFixed(1)} · ${env.replace(/_/g, ' ')}`
      : env.replace(/_/g, ' ');

  const energyNote =
    Math.abs(cl) >= 0.05 ? `CL ${fmt(cl)} · DXY ${fmt(dxy)}` : `DXY ${fmt(dxy)} · XAU ${fmt(xau)}`;

  return {
    asOf: new Date().toISOString(),
    score,
    label,
    regimeLabel,
    summary,
    factors: [
      {
        label: `${month} catalyst window`,
        weight: 32,
        note: `${sessionLabel} session · dense macro on live calendar`,
      },
      {
        label: 'Nasdaq leadership',
        weight: 30,
        note: `NQ ${fmt(nq)} · ES ${fmt(es)}`,
      },
      {
        label: xau > 0.15 ? 'Gold bid' : xau < -0.15 ? 'Gold offered' : 'Mixed sentiment',
        weight: 20,
        note: energyNote,
      },
      {
        label: vix != null && vix > 22 ? 'Vol elevated' : 'Rates softening',
        weight: 18,
        note: volNote,
      },
    ],
    source: tapeIsLive(prices) ? 'live_tape' : 'regime_only',
    live: tapeIsLive(prices),
  };
}

export function computeScheduleRiskFromEvents(events = [], windowDays = 14) {
  const now = Date.now();
  const horizon = now + windowDays * 24 * 60 * 60 * 1000;
  const relevant = (events || []).filter((ev) => {
    const t = new Date(ev.event_time).getTime();
    return t >= now - 60_000 && t <= horizon;
  });

  const highOnly = relevant.filter(
    (ev) => String(ev.impact || ev.importance || '').toUpperCase() === 'HIGH',
  );
  const pool = highOnly.length ? highOnly : relevant;
  const eventCount = pool.length;
  const score = Math.max(5, Math.min(95, 100 - eventCount * 6));
  const level = score >= 70 ? 'Low' : score >= 45 ? 'Moderate' : 'Elevated';

  const description =
    eventCount === 0
      ? 'No high-impact releases in the next two weeks — sync calendar for live US macro window.'
      : eventCount <= 2
        ? 'Light macro week ahead — few high-impact US prints scheduled; surprise risk is moderate outside headline days.'
        : `Calendar flags ${eventCount} high-impact release${eventCount > 1 ? 's' : ''} in the next ${windowDays} days — inflation, employment, and policy prints that can move rates and risk assets.`;

  return {
    asOf: new Date().toISOString(),
    score,
    level,
    description,
    riskStatement: `${level.toUpperCase()} RISK BASED ON CURRENT SCHEDULE.`,
    events: pool,
    source: 'live_calendar',
    live: eventCount > 0,
  };
}

export function scheduleRiskUnavailable() {
  return {
    asOf: new Date().toISOString(),
    score: null,
    level: null,
    description: 'Loading macro schedule — sync calendar to pull US releases.',
    riskStatement: null,
    events: [],
    source: 'loading',
    unavailable: true,
    live: false,
  };
}

export function formatDeskLiveTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const sec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (sec < 8) return 'Just now';
    if (sec < 60) return `${sec}s ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}
