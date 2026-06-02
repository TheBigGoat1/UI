export const CHART_INTERVALS = ["1m", "5m", "15m", "30m", "1h", "4h", "1day", "1week"];
export const CHART_PERIODS = ["1D", "1W", "1M", "3M", "1Y"];

export const DEFAULT_CHART = { interval: "4h", period: "1M" };

export function formatIntervalLabel(interval) {
  const map = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1H',
    '4h': '4H',
    '1day': '1D',
    '1week': '1W',
  };
  const key = String(interval || '4h').toLowerCase();
  if (key === '1d') return '1D';
  if (key === '1w') return '1W';
  return map[key] || interval;
}

export function periodToInterval(period) {
  const map = {
    "1D": "5m",
    "1W": "1h",
    "1M": "4h",
    "3M": "1day",
    "1Y": "1day",
  };
  return map[period] || "4h";
}

export function normalizeOhlcRows(data) {
  if (!Array.isArray(data)) return [];
  const map = new Map();
  for (const d of data) {
    const time =
      d.time == null
        ? null
        : typeof d.time === 'string'
          ? Math.floor(new Date(d.time).getTime() / 1000)
          : d.time > 1e12
            ? Math.floor(d.time / 1000)
            : Math.floor(Number(d.time));
    const close = Number(d.close);
    if (time == null || Number.isNaN(close)) continue;
    map.set(time, {
      time,
      open: Number(d.open) || close,
      high: Number(d.high) || close,
      low: Number(d.low) || close,
      close,
    });
  }
  return Array.from(map.values()).sort((a, b) => a.time - b.time);
}

const BAR_COUNTS = { "1D": 96, "1W": 168, "1M": 180, "3M": 220, "1Y": 365 };

function intervalStepSeconds(interval) {
  const map = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "1h": 3600,
    "4h": 14400,
    "1day": 86400,
    "1week": 604800,
  };
  return map[interval] || 14400;
}

/** Local OHLC fallback when the API is down or rate-limited (keeps charts visible). */
export function buildClientSyntheticHistory(symbol, interval, period, basePrice = 100) {
  const count = BAR_COUNTS[period] || 180;
  const step = intervalStepSeconds(interval);
  const seed = String(symbol || "X")
    .split("")
    .reduce((s, c) => s + c.charCodeAt(0), 0);
  let price = Number(basePrice) > 0 ? Number(basePrice) : 100;
  const now = Math.floor(Date.now() / 1000);
  const bars = [];
  for (let i = count; i >= 0; i -= 1) {
    const wave = Math.sin((seed + i) * 0.17) * 0.004;
    const drift = Math.cos((seed + i) * 0.05) * 0.0015;
    price = Math.max(price * (1 + wave + drift), price * 0.85);
    bars.push({
      time: now - i * step,
      open: price * 0.999,
      high: price * 1.002,
      low: price * 0.998,
      close: price,
    });
  }
  return bars;
}

/** Synthetic OHLC for a specific backtest date window. */
export function buildClientSyntheticHistoryForRange(
  symbol,
  interval,
  startDate,
  endDate,
  basePrice = 100,
) {
  const step = intervalStepSeconds(interval);
  const startTs = Math.floor(new Date(`${startDate}T00:00:00Z`).getTime() / 1000);
  const endTs = Math.floor(new Date(`${endDate}T23:59:59Z`).getTime() / 1000);
  const seed = String(symbol || 'X')
    .split('')
    .reduce((s, c) => s + c.charCodeAt(0), 0);
  let price = Number(basePrice) > 0 ? Number(basePrice) : 100;
  const bars = [];

  for (let t = startTs, i = 0; t <= endTs; t += step, i += 1) {
    const wave = Math.sin((seed + i) * 0.17) * 0.004;
    const drift = Math.cos((seed + i) * 0.05) * 0.0015;
    price = Math.max(price * (1 + wave + drift), price * 0.85);
    bars.push({
      time: t,
      open: price * 0.999,
      high: price * 1.002,
      low: price * 0.998,
      close: price,
    });
  }

  if (bars.length >= 30) return bars;
  return buildClientSyntheticHistory(symbol, interval, '1M', basePrice);
}
