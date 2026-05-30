/**
 * Binance public market data (no API key required).
 * https://binance-docs.github.io/apidocs/spot/en/#market-data-endpoints
 */

const BASE = "https://api.binance.com/api/v3";

const INTERVAL_MAP = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
  "1day": "1d",
  "1week": "1w",
};

/** INSIDR symbol e.g. BTCUSD → BTCUSDT */
export function toBinanceSymbol(asset) {
  const key = String(asset || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (key.endsWith("USDT")) return key;
  if (key.endsWith("USD")) return `${key.slice(0, -3)}USDT`;
  return `${key}USDT`;
}

export function isBinanceAsset(meta) {
  return Boolean(meta?.binance || meta?.class === "crypto");
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "INSIDR/1.0" } });
  if (!res.ok) throw new Error(`Binance ${res.status}`);
  return res.json();
}

export async function fetchBinancePrice(asset) {
  const symbol = toBinanceSymbol(asset);
  const json = await fetchJson(`${BASE}/ticker/24hr?symbol=${symbol}`);
  const price = Number(json.lastPrice);
  const changePercent = Number(json.priceChangePercent);
  const change = Number(json.priceChange);
  return {
    price,
    change,
    changePercent,
    updatedAt: new Date().toISOString(),
    source: "binance",
  };
}

function mapKlineRows(rows) {
  return rows.map((k) => ({
    time: Math.floor(k[0] / 1000),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
  }));
}

export async function fetchBinanceKlines(asset, interval = "4h", limit = 300) {
  const symbol = toBinanceSymbol(asset);
  const binanceInterval = INTERVAL_MAP[interval] || "4h";
  const cap = Math.min(1000, Math.max(50, limit));

  const url = `${BASE}/klines?symbol=${symbol}&interval=${binanceInterval}&limit=${cap}`;
  const rows = await fetchJson(url);
  return mapKlineRows(rows);
}

/** Paginated klines between UTC dates (for backtests). */
export async function fetchBinanceKlinesRange(
  asset,
  interval = "4h",
  startDate,
  endDate,
) {
  const symbol = toBinanceSymbol(asset);
  const binanceInterval = INTERVAL_MAP[interval] || "4h";
  let startMs = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const endMs = new Date(`${endDate}T23:59:59.999Z`).getTime();
  const all = [];

  while (startMs < endMs && all.length < 2000) {
    const url = `${BASE}/klines?symbol=${symbol}&interval=${binanceInterval}&startTime=${startMs}&endTime=${endMs}&limit=1000`;
    const rows = await fetchJson(url);
    if (!rows.length) break;
    all.push(...mapKlineRows(rows));
    const lastOpen = rows[rows.length - 1][0];
    if (lastOpen <= startMs) break;
    startMs = lastOpen + 1;
    if (rows.length < 1000) break;
  }

  return all;
}

/** Batch 24h tickers for all USDT pairs (cache-friendly subset) */
export async function fetchBinanceTickersForAssets(assets) {
  const all = await fetchJson(`${BASE}/ticker/24hr`);
  const wanted = new Set(assets.map((a) => toBinanceSymbol(a.asset || a)));
  const out = {};

  for (const row of all) {
    if (!wanted.has(row.symbol)) continue;
    const base = row.symbol.replace("USDT", "");
    const insidrKey = `${base}USD`;
    out[insidrKey] = {
      price: Number(row.lastPrice),
      change: Number(row.priceChange),
      changePercent: Number(row.priceChangePercent),
      updatedAt: new Date().toISOString(),
      source: "binance",
    };
  }
  return out;
}
