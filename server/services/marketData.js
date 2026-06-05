import { ASSETS, getAssetMeta, getTradingViewTicker } from "../config/assets.js";
import { cached, hasRedisCache } from "./cache.js";
import { env } from "../config/env.js";
import {
  fetchBinanceKlines,
  fetchBinanceKlinesRange,
  fetchBinancePrice,
  fetchBinanceTickersForAssets,
  isBinanceAsset,
} from "./binance.js";
import { applyDeskPriceAliases } from "../utils/deskSymbols.js";

const TWELVE_KEY = () => env("TWELVE_DATA_API_KEY") || env("VITE_TWELVE_DATA_API_KEY");

const YAHOO_INTERVAL = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "1h",
  "1day": "1d",
  "1week": "1wk",
};

const PERIOD_RANGE = {
  "1D": "1d",
  "1W": "5d",
  "1M": "1mo",
  "3M": "3mo",
  "1Y": "1y",
};

function tradingViewTickerForMeta(meta) {
  return getTradingViewTicker(meta);
}

function intervalStep(interval) {
  const map = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "1h": 3600,
    "4h": 14400,
    "1day": 86400,
    "1week": 604800,
  };
  return map[interval] || 3600;
}

async function fetchJson(url, options = {}) {
  try {
    const res = await fetch(url, {
      ...options,
      headers: { "User-Agent": "INSIDR/1.0", ...options.headers },
    });
    if (!res.ok) {
      if (res.status === 429) return null;
      throw new Error(`HTTP ${res.status}`);
    }
    return res.json();
  } catch (err) {
    if (String(err?.message || "").includes("429")) return null;
    throw err;
  }
}

async function fetchTradingViewQuote(tvTicker) {
  if (!tvTicker) return null;
  try {
    const url = "https://scanner.tradingview.com/global/scan";
    const payload = {
      symbols: { tickers: [tvTicker], query: { types: [] } },
      columns: ["close", "change", "change_abs"],
    };
    const json = await fetchJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const row = Array.isArray(json?.data) ? json.data[0] : null;
    const [close, changePct, changeAbs] = Array.isArray(row?.d) ? row.d : [];
    const price = Number(close);
    const changePercent = Number(changePct);
    const change = Number(changeAbs);
    if (!Number.isFinite(price) || price <= 0) return null;
    return {
      price,
      change: Number.isFinite(change) ? change : 0,
      changePercent: Number.isFinite(changePercent) ? changePercent : 0,
      updatedAt: new Date().toISOString(),
      source: "tradingview",
      synthetic: false,
    };
  } catch {
    return null;
  }
}

/** Batch TradingView scanner quotes — aligns desk prices with chart ticker. */
async function fetchTradingViewQuotesBatch(entries = []) {
  const out = {};
  if (!entries.length) return out;
  const CHUNK = 40;
  for (let i = 0; i < entries.length; i += CHUNK) {
    const chunk = entries.slice(i, i + CHUNK);
    try {
      const url = "https://scanner.tradingview.com/global/scan";
      const payload = {
        symbols: { tickers: chunk.map((e) => e.ticker), query: { types: [] } },
        columns: ["close", "change", "change_abs"],
      };
      const json = await fetchJson(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const rows = Array.isArray(json?.data) ? json.data : [];
      const byTicker = new Map(chunk.map((e) => [e.ticker, e.asset]));
      for (const row of rows) {
        const ticker = row?.s;
        const asset = byTicker.get(ticker);
        if (!asset) continue;
        const [close, changePct, changeAbs] = Array.isArray(row?.d) ? row.d : [];
        const price = Number(close);
        if (!Number.isFinite(price) || price <= 0) continue;
        out[asset] = {
          price,
          change: Number.isFinite(Number(changeAbs)) ? Number(changeAbs) : 0,
          changePercent: Number.isFinite(Number(changePct)) ? Number(changePct) : 0,
          updatedAt: new Date().toISOString(),
          source: "tradingview",
          synthetic: false,
        };
      }
    } catch {
      /* chunk failed — keep yahoo/binance fallbacks */
    }
  }
  return out;
}

async function fetchYahooChart(yahooSymbol, interval = "1d", range = "1mo") {
  try {
    const yInt = YAHOO_INTERVAL[interval] || "1d";
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${yInt}&range=${range}`;
    const json = await fetchJson(url);
    if (!json) return [];
    const result = json?.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const closes = quote.close || [];

    return timestamps
      .map((ts, i) => ({
        time: ts,
        open: quote.open?.[i] ?? closes[i],
        high: quote.high?.[i] ?? closes[i],
        low: quote.low?.[i] ?? closes[i],
        close: closes[i],
      }))
      .filter((bar) => bar.close != null && !Number.isNaN(bar.close));
  } catch {
    return [];
  }
}

async function fetchTwelveQuote(symbol) {
  const key = TWELVE_KEY();
  if (!key) return null;
  try {
    const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbol)}&apikey=${key}`;
    const json = await fetchJson(url);
    if (!json || json?.status === "error") return null;
    const price = Number(json.price);
    return Number.isFinite(price) ? price : null;
  } catch {
    return null;
  }
}

async function fetchTwelveTimeSeries(symbol, interval, outputsize = 120) {
  const key = TWELVE_KEY();
  if (!key) return null;
  try {
    const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${outputsize}&apikey=${key}`;
    const json = await fetchJson(url);
    if (!json || json?.status === "error" || !json?.values?.length) return null;
    return json.values
      .map((row) => ({
        time: Math.floor(new Date(row.datetime).getTime() / 1000),
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
      }))
      .filter((b) => Number.isFinite(b.close))
      .reverse();
  } catch {
    return null;
  }
}

function syntheticHistory(meta, interval, bars = 120) {
  const barCount = typeof bars === "number" ? bars : 120;
  const seed = meta.asset.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  let price = meta.basePrice;
  const now = Math.floor(Date.now() / 1000);
  const step = intervalStep(interval);

  const data = [];
  for (let i = barCount; i >= 0; i--) {
    const wave = Math.sin((seed + i) * 0.17) * 0.004;
    const drift = Math.cos((seed + i) * 0.05) * 0.0015;
    price = Math.max(price * (1 + wave + drift), meta.basePrice * 0.85);
    data.push({
      time: now - i * step,
      open: price * 0.999,
      high: price * 1.002,
      low: price * 0.998,
      close: price,
    });
  }
  return data;
}

function syntheticPrice(meta) {
  const hist = syntheticHistory(meta, "1day", 5);
  const last = hist[hist.length - 1];
  const prev = hist[hist.length - 2] || last;
  const change = last.close - prev.close;
  const changePercent = prev.close ? (change / prev.close) * 100 : 0;
  return { price: last.close, change, changePercent };
}

function klineLimitForPeriod(period) {
  const map = { "1D": 96, "1W": 168, "1M": 180, "3M": 220, "1Y": 365 };
  return map[period] || 180;
}

/** Normalized history payload — always includes synthetic flag for honest UI labeling. */
export function historyResult(bars, synthetic, source) {
  return {
    bars: Array.isArray(bars) ? bars : [],
    synthetic: Boolean(synthetic),
    source: source || (synthetic ? "model" : "live"),
  };
}

/** @deprecated internal — unwrap legacy array responses if any remain in cache. */
export function unwrapHistory(result) {
  if (Array.isArray(result)) {
    return historyResult(result, false, "legacy");
  }
  return historyResult(result?.bars, result?.synthetic, result?.source);
}

export async function getAllPrices() {
  const priceTtl = hasRedisCache() ? 2000 : 1000;
  return cached("market:prices", priceTtl, async () => {
    const out = {};
    const cryptoAssets = ASSETS.filter((a) => isBinanceAsset(a));
    const tvEntries = ASSETS.map((meta) => ({
      asset: meta.asset,
      ticker: tradingViewTickerForMeta(meta),
    })).filter((e) => e.ticker);

    const [binanceBatch, tvQuotes] = await Promise.all([
      fetchBinanceTickersForAssets(cryptoAssets).catch(() => ({})),
      fetchTradingViewQuotesBatch(tvEntries),
    ]);

    Object.assign(out, binanceBatch);
    for (const [asset, quote] of Object.entries(tvQuotes)) {
      if (quote?.price != null) out[asset] = quote;
    }

    const missing = ASSETS.filter((meta) => !out[meta.asset]?.price);

    await Promise.all(
      missing.map(async (meta) => {
        try {
          if (isBinanceAsset(meta)) {
            const row = await fetchBinancePrice(meta.asset).catch(() => null);
            if (row?.price != null) {
              out[meta.asset] = row;
              return;
            }
          }
          const yahoo = await fetchYahooQuoteChange(meta.yahoo).catch(() => null);
          if (yahoo?.price != null) {
            out[meta.asset] = { ...yahoo, synthetic: false };
            return;
          }
          const syn = syntheticPrice(meta);
          out[meta.asset] = {
            price: syn.price,
            change: syn.change,
            changePercent: syn.changePercent,
            updatedAt: new Date().toISOString(),
            synthetic: true,
          };
        } catch {
          const syn = syntheticPrice(meta);
          out[meta.asset] = {
            price: syn.price,
            change: syn.change,
            changePercent: syn.changePercent,
            updatedAt: new Date().toISOString(),
            synthetic: true,
          };
        }
      }),
    );

    if (!out.DXY?.price) {
      try {
        const dxy = await fetchYahooQuoteChange("DX-Y=F");
        if (dxy?.price != null) {
          out.DXY = { ...dxy, source: "yahoo" };
        }
      } catch {
        /* optional */
      }
    }

    return applyDeskPriceAliases(out);
  });
}

/** Fast single-symbol quote — short cache for active chart symbol (sub-second desk). */
export async function getLiveQuote(symbol) {
  const meta = getAssetMeta(symbol);
  if (!meta?.asset) return null;
  const cacheKey = `quote:live:${meta.asset}`;
  const quoteTtl = 200;

  return cached(cacheKey, quoteTtl, async () => {
    try {
      const tvTicker = tradingViewTickerForMeta(meta);
      const tvQuote = await fetchTradingViewQuote(tvTicker);
      if (tvQuote?.price != null) return tvQuote;

      if (isBinanceAsset(meta)) {
        const row = await fetchBinancePrice(meta.asset);
        if (row?.price != null) {
          return {
            price: row.price,
            change: row.change ?? 0,
            changePercent: row.changePercent ?? 0,
            updatedAt: new Date().toISOString(),
            source: 'binance',
            synthetic: false,
          };
        }
      }

      const twelveSpot = await fetchTwelveQuote(meta.asset);
      if (twelveSpot != null) {
        const series = await fetchTwelveTimeSeries(meta.asset, "1h", 40).catch(() => null);
        const latest = Array.isArray(series) && series.length ? series[series.length - 1] : null;
        const prev = Array.isArray(series) && series.length > 1 ? series[series.length - 2] : null;
        const refPrice =
          Number.isFinite(Number(prev?.close)) && Number(prev.close) !== 0
            ? Number(prev.close)
            : null;
        const change = refPrice != null ? twelveSpot - refPrice : 0;
        const changePercent = refPrice != null ? (change / refPrice) * 100 : 0;
        return {
          price: twelveSpot,
          change,
          changePercent,
          updatedAt: new Date().toISOString(),
          source: "twelve-data",
          synthetic: false,
        };
      }

      const yahoo = await fetchYahooQuoteChange(meta.yahoo);
      if (yahoo?.price != null) {
        return { ...yahoo, synthetic: false };
      }
    } catch {
      /* fall through */
    }
    return null;
  });
}

function barCountForPeriod(period) {
  const map = { "1D": 96, "1W": 168, "1M": 180, "3M": 220, "1Y": 365 };
  return map[period] || 180;
}

export function getSyntheticHistory(symbol, interval = "1day", period = "1M") {
  const meta = getAssetMeta(symbol) || { asset: symbol, basePrice: 100, yahoo: symbol };
  return syntheticHistory(meta, interval, barCountForPeriod(period));
}

/** Synthetic OHLC aligned to a backtest date window — always enough bars. */
export function getSyntheticHistoryForRange(symbol, interval, startDate, endDate) {
  const meta = getAssetMeta(symbol) || { asset: symbol, basePrice: 100, yahoo: symbol };
  const startTs = Math.floor(new Date(`${startDate}T00:00:00Z`).getTime() / 1000);
  const endTs = Math.floor(new Date(`${endDate}T23:59:59Z`).getTime() / 1000);
  const step = intervalStep(interval);
  const seed = meta.asset.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  let price = meta.basePrice;
  const bars = [];

  for (let t = startTs; t <= endTs; t += step) {
    const i = Math.floor((t - startTs) / step);
    const wave = Math.sin((seed + i) * 0.17) * 0.004;
    const drift = Math.cos((seed + i) * 0.05) * 0.0015;
    price = Math.max(price * (1 + wave + drift), meta.basePrice * 0.85);
    bars.push({
      time: t,
      open: price * 0.999,
      high: price * 1.002,
      low: price * 0.998,
      close: price,
    });
  }

  if (bars.length >= 30) return bars;
  return syntheticHistory(meta, interval, 220);
}

export async function getHistory(symbol, interval = "1day", period = "1M") {
  const meta = getAssetMeta(symbol) || { asset: symbol, basePrice: 100, yahoo: symbol };
  const range = PERIOD_RANGE[period] || "1mo";
  const cacheKey = `history:${meta.asset}:${interval}:${period}`;
  const shortInterval = ['1m', '5m', '15m', '30m'].includes(String(interval).toLowerCase());
  const historyTtl = shortInterval
    ? hasRedisCache()
      ? 12000
      : 6000
    : hasRedisCache()
      ? 45000
      : 15000;
  const fallbackBars = () =>
    syntheticHistory(meta, interval, barCountForPeriod(period));

  try {
    const raw = await cached(cacheKey, historyTtl, async () => {
      if (isBinanceAsset(meta)) {
        try {
          const limit = klineLimitForPeriod(period);
          const klines = await fetchBinanceKlines(meta.asset, interval, limit);
          if (klines.length >= 2) return historyResult(klines, false, "binance");
        } catch {
          /* fall through */
        }
      }

      const twelveInterval =
        interval === "1week"
          ? "1week"
          : interval === "1day"
            ? "1day"
            : interval === "4h"
              ? "4h"
              : interval;

      const twelve = await fetchTwelveTimeSeries(meta.asset, twelveInterval, 200);
      if (twelve?.length >= 2) return historyResult(twelve, false, "twelve-data");

      let yahooInterval = YAHOO_INTERVAL[interval] || "1d";
      let yahooRange = range;
      if (interval === "4h") {
        yahooInterval = "1h";
        yahooRange =
          period === "1W" ? "5d" : period === "3M" ? "3mo" : period === "1Y" ? "1y" : "1mo";
      } else if (interval === "1h" && period === "1M") {
        yahooRange = "1mo";
      }

      try {
        const yahoo = await fetchYahooChart(meta.yahoo, yahooInterval, yahooRange);
        if (yahoo.length >= 2) return historyResult(yahoo, false, "yahoo");
      } catch {
        /* synthetic below */
      }

      return historyResult(fallbackBars(), true, "model");
    });
    return unwrapHistory(raw);
  } catch (err) {
    console.warn("[market] getHistory fallback:", meta.asset, err.message);
    return historyResult(fallbackBars(), true, "model");
  }
}

function filterBarsByRange(bars, startDate, endDate) {
  const startTs = startDate ? Math.floor(new Date(startDate).getTime() / 1000) : null;
  const endTs = endDate
    ? Math.floor(new Date(`${endDate}T23:59:59`).getTime() / 1000)
    : null;
  return bars.filter((bar) => {
    const t = bar.time > 1e12 ? Math.floor(bar.time / 1000) : bar.time;
    if (startTs && t < startTs) return false;
    if (endTs && t > endTs) return false;
    return true;
  });
}

function periodForDaySpan(days) {
  if (days <= 7) return "1W";
  if (days <= 35) return "1M";
  if (days <= 120) return "3M";
  return "1Y";
}

/** Historical bars constrained to [startDate, endDate] for backtesting. */
export async function getHistoryForRange(
  symbol,
  interval = "4h",
  startDate,
  endDate,
) {
  try {
    const meta = getAssetMeta(symbol);
    if (!meta) {
      return filterBarsByRange(
        getSyntheticHistoryForRange(symbol, interval, startDate, endDate),
        startDate,
        endDate,
      );
    }

    const days =
      (new Date(endDate) - new Date(startDate)) / 86400000 + 1;
    const period = periodForDaySpan(days);

    if (isBinanceAsset(meta)) {
      try {
        const klines = await fetchBinanceKlinesRange(
          meta.asset,
          interval,
          startDate,
          endDate,
        );
        if (klines.length >= 30) {
          return filterBarsByRange(klines, startDate, endDate);
        }
      } catch {
        /* fall through */
      }
    }

    const twelveInterval =
      interval === "1week" ? "1week" : interval === "1day" ? "1day" : interval === "4h" ? "4h" : interval;
    const outputsize = Math.min(5000, Math.max(200, Math.ceil(days * 8)));
    const twelve = await fetchTwelveTimeSeries(meta.asset, twelveInterval, outputsize);
    if (twelve?.length) {
      const filtered = filterBarsByRange(twelve, startDate, endDate);
      if (filtered.length >= 30) return filtered;
    }

    try {
      const loaded = await getHistory(symbol, interval, period);
      const filtered = filterBarsByRange(loaded.bars, startDate, endDate);
      if (filtered.length >= 30) return filtered;
    } catch {
      /* synthetic below */
    }

    const ranged = filterBarsByRange(
      getSyntheticHistoryForRange(symbol, interval, startDate, endDate),
      startDate,
      endDate,
    );
    if (ranged.length >= 30) return ranged;

    return getSyntheticHistoryForRange(symbol, interval, startDate, endDate);
  } catch (err) {
    console.warn("[market] getHistoryForRange fallback:", symbol, err.message);
    return getSyntheticHistoryForRange(symbol, interval, startDate, endDate);
  }
}

export function getAssetsList() {
  return ASSETS.map(({ asset, class: assetClass, binance }) => ({
    asset,
    symbol: asset,
    class: assetClass,
    dataSource: binance ? "binance" : "yahoo",
  }));
}

/** Live quote + session % change from Yahoo (no synthetic). */
export async function fetchYahooQuoteChange(yahooSymbol) {
  const bars = await fetchYahooChart(yahooSymbol, "1d", "5d");
  if (bars.length < 2) return null;
  const last = bars[bars.length - 1];
  const prev = bars[bars.length - 2];
  const change = last.close - prev.close;
  const changePercent = prev.close ? (change / prev.close) * 100 : 0;
  return {
    price: last.close,
    change,
    changePercent,
    updatedAt: new Date(last.time * 1000).toISOString(),
    source: "yahoo",
  };
}

/** Historical closes for desk charts (Yahoo). */
export async function fetchYahooHistorySeries(yahooSymbol, interval = "1day", range = "5y") {
  const bars = await fetchYahooChart(yahooSymbol, interval, range);
  return bars.filter((b) => b.close != null);
}
