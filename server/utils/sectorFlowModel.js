/**
 * Sector ETF session % — derived from live desk symbols when direct ETF quotes fail.
 * Multi-leg betas create realistic spread even when ES/NQ share the same sign.
 */

import { pickPriceRow } from "./deskSymbols.js";

/** Safe-haven proxies — Yahoo ETFs when available, else FX/gold legs */
export const HAVEN_FLOW_MODEL = [
  { ticker: "FXY", name: "Yen", legs: [{ s: "USDJPY", w: -1.02 }] },
  { ticker: "FXF", name: "Swiss Franc", legs: [{ s: "EURUSD", w: -0.28 }, { s: "DXY", w: -0.18 }] },
  { ticker: "GLD", name: "Gold", legs: [{ s: "XAUUSD", w: 0.95 }] },
  { ticker: "TLT", name: "Long Treasuries", legs: [{ s: "US10Y", w: -0.85 }, { s: "ESUSD", w: -0.12 }] },
  { ticker: "XLU", name: "Utilities", legs: [{ s: "ESUSD", w: 0.38 }, { s: "CLUSD", w: -0.06 }] },
  { ticker: "XLV", name: "Healthcare", legs: [{ s: "ESUSD", w: 0.52 }, { s: "NQUSD", w: 0.06 }] },
  { ticker: "XLP", name: "Consumer Staples", legs: [{ s: "ESUSD", w: 0.42 }, { s: "XAUUSD", w: 0.1 }] },
];

export const SECTOR_FLOW_MODEL = [
  { ticker: "XLK", name: "Technology", legs: [{ s: "NQUSD", w: 1.18 }, { s: "ESUSD", w: -0.1 }] },
  { ticker: "XLE", name: "Energy", legs: [{ s: "CLUSD", w: 1.08 }, { s: "ESUSD", w: -0.05 }] },
  { ticker: "QQQ", name: "Nasdaq-100", legs: [{ s: "NQUSD", w: 1.0 }] },
  { ticker: "SPY", name: "S&P 500", legs: [{ s: "ESUSD", w: 1.0 }] },
  { ticker: "VTI", name: "Total Market", legs: [{ s: "ESUSD", w: 0.97 }, { s: "NQUSD", w: 0.06 }] },
  { ticker: "DIA", name: "Dow Jones", legs: [{ s: "ESUSD", w: 0.9 }, { s: "DXY", w: 0.1 }] },
  { ticker: "XLF", name: "Financials", legs: [{ s: "ESUSD", w: 0.82 }, { s: "DXY", w: 0.14 }] },
  { ticker: "IWM", name: "Russell 2000", legs: [{ s: "ESUSD", w: 1.12 }, { s: "NQUSD", w: -0.08 }] },
  { ticker: "XLI", name: "Industrials", legs: [{ s: "ESUSD", w: 0.94 }, { s: "CLUSD", w: 0.07 }] },
  { ticker: "XLRE", name: "Real Estate", legs: [{ s: "ESUSD", w: 0.62 }, { s: "DXY", w: -0.12 }] },
  { ticker: "XLV", name: "Healthcare", legs: [{ s: "ESUSD", w: 0.52 }, { s: "NQUSD", w: 0.06 }] },
  { ticker: "XLP", name: "Consumer Staples", legs: [{ s: "ESUSD", w: 0.42 }, { s: "XAUUSD", w: 0.1 }] },
  { ticker: "XLU", name: "Utilities", legs: [{ s: "ESUSD", w: 0.38 }, { s: "CLUSD", w: -0.06 }] },
];

export function pctFromPriceRow(prices, symbol) {
  const row = pickPriceRow(prices, symbol);
  if (!row || row.synthetic) return 0;
  const cp = row.changePercent ?? row.change_percent;
  if (cp != null && Number.isFinite(Number(cp))) return Number(cp);
  if (row.price != null && row.change != null && Number(row.price)) {
    return (Number(row.change) / Number(row.price)) * 100;
  }
  return 0;
}

function buildFlowsFromModel(model, prices) {
  return model.map(({ ticker, name, legs }) => {
    const pct = legs.reduce((sum, leg) => sum + pctFromPriceRow(prices, leg.s) * leg.w, 0);
    return {
      ticker,
      name,
      pct: Number(pct.toFixed(2)),
      source: "live_tape",
    };
  });
}

export function buildSectorFlowsFromPrices(prices = {}) {
  return buildFlowsFromModel(SECTOR_FLOW_MODEL, prices);
}

export function buildHavenFlowsFromPrices(prices = {}) {
  return buildFlowsFromModel(HAVEN_FLOW_MODEL, prices);
}

export function buildAllFlowsFromPrices(prices = {}) {
  return [...buildSectorFlowsFromPrices(prices), ...buildHavenFlowsFromPrices(prices)];
}

export function flowsAreFlat(flows = [], epsilon = 0.003) {
  return !flows.length || flows.every((f) => Math.abs(Number(f.pct)) < epsilon);
}

export function mergeFlowRows(yahooRows = [], modelRows = []) {
  return mergeFlowRowsLive(yahooRows, modelRows);
}

export function mergeFlowRowsLive(yahooRows = [], tapeRows = []) {
  const byTicker = new Map();
  for (const row of tapeRows) {
    byTicker.set(row.ticker, { ...row, source: row.source || "live_tape" });
  }
  for (const row of yahooRows) {
    if (!row?.ticker) continue;
    const existing = byTicker.get(row.ticker);
    const yAbs = Math.abs(Number(row.pct));
    const tAbs = Math.abs(Number(existing?.pct ?? 0));
    if (!existing) {
      byTicker.set(row.ticker, { ...row, source: row.source || "yahoo" });
    } else if (yAbs >= 0.003 && yAbs >= tAbs) {
      byTicker.set(row.ticker, { ...row, source: row.source || "yahoo" });
    } else if (tAbs < 0.003 && yAbs >= 0.003) {
      byTicker.set(row.ticker, { ...row, source: row.source || "yahoo" });
    }
  }
  const order = [
    ...SECTOR_FLOW_MODEL.map((r) => r.ticker),
    ...HAVEN_FLOW_MODEL.map((r) => r.ticker),
  ];
  const seen = new Set();
  const out = [];
  for (const t of order) {
    if (seen.has(t)) continue;
    seen.add(t);
    const row = byTicker.get(t);
    if (row) out.push(row);
  }
  for (const [t, row] of byTicker) {
    if (!seen.has(t)) out.push(row);
  }
  return out;
}
