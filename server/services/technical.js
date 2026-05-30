import { formatTfLabel } from "../utils/timeframeStack.js";
import { getSyntheticHistory } from "./marketData.js";

function normalizeBars(bars) {
  if (!Array.isArray(bars)) return [];
  return bars
    .map((b) => ({
      time: b.time,
      open: Number(b.open),
      high: Number(b.high),
      low: Number(b.low),
      close: Number(b.close),
    }))
    .filter((b) => Number.isFinite(b.close));
}

export function computeRSI(closes, period = 14) {
  if (!closes || closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i += 1) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return Math.round(100 - 100 / (1 + rs));
}

export function computeSwingLevels(bars) {
  const slice = bars.slice(-30);
  if (!slice.length) {
    return { support: null, resistance: null, last: null };
  }
  const highs = slice.map((b) => b.high).filter(Number.isFinite);
  const lows = slice.map((b) => b.low).filter(Number.isFinite);
  const last = slice[slice.length - 1].close;
  return {
    support: lows.length ? Math.min(...lows) : last,
    resistance: highs.length ? Math.max(...highs) : last,
    last,
  };
}

export function computeVolatility(bars) {
  const closes = bars.map((b) => b.close);
  if (closes.length < 5) return { state: "NORMAL", atrPct: 0 };
  const ranges = [];
  for (let i = 1; i < closes.length; i += 1) {
    ranges.push(Math.abs(closes[i] - closes[i - 1]));
  }
  const atr = ranges.slice(-14).reduce((a, b) => a + b, 0) / Math.min(14, ranges.length);
  const last = closes[closes.length - 1];
  const atrPct = last ? (atr / last) * 100 : 0;
  let state = "NORMAL";
  if (atrPct > 1.2) state = "HIGH";
  else if (atrPct < 0.25) state = "LOW";
  return { state, atrPct: Number(atrPct.toFixed(3)) };
}

/** Single-series trend (used for a specific timeframe's OHLC). */
export function trendOfSeries(bars) {
  const clean = normalizeBars(bars);
  if (clean.length < 5) return "NEUTRAL";

  const closes = clean.map((b) => b.close);
  const split = Math.max(2, Math.floor(closes.length * 0.35));
  const early = closes.slice(0, split);
  const earlyAvg = early.reduce((a, b) => a + b, 0) / early.length;
  const last = closes[closes.length - 1];
  const delta = earlyAvg ? (last - earlyAvg) / earlyAvg : 0;

  if (delta > 0.0025) return "BULLISH";
  if (delta < -0.0025) return "BEARISH";
  return "NEUTRAL";
}

export function combineTimeframeTrends(htfTrend, ltfTrend) {
  let bias = "neutral";
  if (htfTrend === "BULLISH" && ltfTrend !== "BEARISH") bias = "bullish";
  if (htfTrend === "BEARISH" && ltfTrend !== "BULLISH") bias = "bearish";
  if (ltfTrend === "BULLISH" && htfTrend === "NEUTRAL") bias = "bullish";
  if (ltfTrend === "BEARISH" && htfTrend === "NEUTRAL") bias = "bearish";

  let alignment = "MIXED";
  if (htfTrend === ltfTrend && htfTrend !== "NEUTRAL") alignment = "ALIGNED";
  else if (
    (htfTrend === "BULLISH" && ltfTrend === "BEARISH") ||
    (htfTrend === "BEARISH" && ltfTrend === "BULLISH")
  ) {
    alignment = "CONFLICTING";
  }

  const strength =
    htfTrend === ltfTrend && htfTrend !== "NEUTRAL"
      ? 18
      : alignment === "CONFLICTING"
        ? -12
        : 6;
  const confidence = Math.min(92, Math.max(42, 58 + strength));

  return { bias, confidence, alignment, htf: { trend: htfTrend }, ltf: { trend: ltfTrend } };
}

export function analyzeBars(bars) {
  const clean = normalizeBars(bars);
  if (clean.length < 10) {
    return {
      htf: { trend: "NEUTRAL" },
      ltf: { trend: "NEUTRAL" },
      bias: "neutral",
      confidence: 50,
      alignment: "MIXED",
    };
  }

  const closes = clean.map((b) => b.close);
  const mid = Math.floor(closes.length / 2);
  const htfSlice = closes.slice(0, mid);
  const ltfSlice = closes.slice(mid);

  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const htfAvg = avg(htfSlice);
  const ltfAvg = avg(ltfSlice);
  const last = closes[closes.length - 1];

  const trendFrom = (early, late) => {
    if (!early) return "NEUTRAL";
    const delta = (late - early) / early;
    if (delta > 0.0025) return "BULLISH";
    if (delta < -0.0025) return "BEARISH";
    return "NEUTRAL";
  };

  const htfTrend = trendFrom(htfAvg, last);
  const ltfTrend = trendFrom(ltfAvg, last);

  let bias = "neutral";
  if (htfTrend === "BULLISH" && ltfTrend !== "BEARISH") bias = "bullish";
  if (htfTrend === "BEARISH" && ltfTrend !== "BULLISH") bias = "bearish";

  const slope = Math.abs((last - closes[0]) / closes[0]);
  const confidence = Math.min(92, Math.round(55 + slope * 800));

  let alignment = "MIXED";
  if (htfTrend === ltfTrend && htfTrend !== "NEUTRAL") alignment = "ALIGNED";
  else if (
    (htfTrend === "BULLISH" && ltfTrend === "BEARISH") ||
    (htfTrend === "BEARISH" && ltfTrend === "BULLISH")
  ) {
    alignment = "CONFLICTING";
  }

  return {
    htf: { trend: htfTrend },
    ltf: { trend: ltfTrend },
    bias,
    confidence,
    alignment,
  };
}

function buildSummary(asset, analysis, rsi, volatility, levels, tfLabels = {}) {
  const biasLabel = analysis.bias.toUpperCase();
  const rsiNote =
    rsi >= 70 ? "RSI stretched high" : rsi <= 30 ? "RSI stretched low" : "RSI balanced";
  const volNote =
    volatility.state === "HIGH"
      ? "elevated volatility"
      : volatility.state === "LOW"
        ? "compressed range"
        : "normal volatility";
  const htfLbl = tfLabels.htf || "HTF";
  const ltfLbl = tfLabels.ltf || "Chart TF";
  const alignNote =
    analysis.alignment === "ALIGNED"
      ? `${htfLbl} and ${ltfLbl} both ${analysis.ltf?.trend?.toLowerCase() || "aligned"}`
      : analysis.alignment === "CONFLICTING"
        ? `${htfLbl} ${analysis.htf?.trend} vs ${ltfLbl} ${analysis.ltf?.trend} — trade the conflict carefully`
        : `${htfLbl} ${analysis.htf?.trend}, ${ltfLbl} ${analysis.ltf?.trend}`;

  return `${asset} on ${ltfLbl}: ${biasLabel} bias (${analysis.confidence}%). ${alignNote}. ${rsiNote}, ${volNote}.`;
}

/** Filter analysis modules per user engine toggles (Settings → Data & feeds). */
export function applyEngineModules(payload, config = {}) {
  if (!payload?.modules || !config || typeof config !== 'object') return payload;

  const next = {
    ...payload,
    modules: { ...payload.modules },
  };

  if (config.marketStructure === false) {
    delete next.modules.marketStructure;
    next.confidence = Math.max(38, (next.confidence || 50) - 14);
  }

  const levelsOff =
    config.supportResistance === false && config.psychologicalLevels === false;
  if (levelsOff) {
    delete next.modules.levels;
    next.confidence = Math.max(38, (next.confidence || 50) - 8);
  } else if (config.supportResistance === false && next.modules.levels) {
    next.modules.levels = { last: next.modules.levels.last };
  }

  if (config.rsiDivergence === false && config.sma === false) {
    delete next.modules.momentum;
    next.confidence = Math.max(38, (next.confidence || 50) - 10);
  }

  const advancedOff =
    config.orderBlocks === false &&
    config.pocLevels === false &&
    config.harmonics === false &&
    config.liquidity === false &&
    config.fibonacci === false;
  if (advancedOff) {
    next.advancedModulesDisabled = true;
  }

  next.enabledModules = Object.entries(config)
    .filter(([, on]) => on !== false)
    .map(([key]) => key);

  return next;
}

export function buildTechnicalPayloadForTimeframes(
  asset,
  chartBars,
  htfBars,
  { chartInterval, chartPeriod, htfInterval, htfPeriod },
) {
  const cleanChart = normalizeBars(chartBars);
  const cleanHtf = normalizeBars(htfBars);

  const htfTrend = trendOfSeries(cleanHtf);
  const ltfTrend = trendOfSeries(cleanChart);
  const analysis = combineTimeframeTrends(htfTrend, ltfTrend);

  const closes = cleanChart.map((b) => b.close);
  const rsi = computeRSI(closes);
  const levels = computeSwingLevels(cleanChart);
  const volatility = computeVolatility(cleanChart);
  const momentumState =
    rsi >= 70 ? "OVERBOUGHT" : rsi <= 30 ? "OVERSOLD" : "NEUTRAL";

  const tfLabels = {
    htf: `${formatTfLabel(htfInterval)} · ${htfPeriod}`,
    ltf: `${formatTfLabel(chartInterval)} · ${chartPeriod}`,
  };

  return {
    asset,
    modules: {
      marketStructure: {
        htf: { ...analysis.htf, interval: htfInterval, period: htfPeriod, label: tfLabels.htf },
        ltf: { ...analysis.ltf, interval: chartInterval, period: chartPeriod, label: tfLabels.ltf },
        alignment: analysis.alignment,
      },
      momentum: { rsi, state: momentumState },
      volatility,
      levels: {
        support: levels.support,
        resistance: levels.resistance,
        last: levels.last,
      },
    },
    bias: analysis.bias,
    confidence: analysis.confidence,
    summary: buildSummary(asset, analysis, rsi, volatility, levels, {
      htf: tfLabels.htf,
      ltf: tfLabels.ltf,
    }),
    barCount: cleanChart.length,
    htfBarCount: cleanHtf.length,
  };
}

export function buildTechnicalPayload(asset, bars) {
  const clean = normalizeBars(bars);
  const analysis = analyzeBars(clean);
  const closes = clean.map((b) => b.close);
  const rsi = computeRSI(closes);
  const levels = computeSwingLevels(clean);
  const volatility = computeVolatility(clean);

  const momentumState =
    rsi >= 70 ? "OVERBOUGHT" : rsi <= 30 ? "OVERSOLD" : "NEUTRAL";

  return {
    asset,
    modules: {
      marketStructure: {
        htf: analysis.htf,
        ltf: analysis.ltf,
        alignment: analysis.alignment,
      },
      momentum: {
        rsi,
        state: momentumState,
      },
      volatility,
      levels: {
        support: levels.support,
        resistance: levels.resistance,
        last: levels.last,
      },
    },
    bias: analysis.bias,
    confidence: analysis.confidence,
    summary: buildSummary(asset, analysis, rsi, volatility, levels),
    barCount: clean.length,
  };
}

export function levelsFromBars(bars, bias) {
  const clean = normalizeBars(bars);
  const last = Number(clean[clean.length - 1]?.close || 0);
  const atr =
    clean.slice(-14).reduce((sum, b, i, arr) => {
      if (i === 0) return sum;
      return sum + Math.abs(Number(b.close) - Number(arr[i - 1].close));
    }, 0) / 14 || last * 0.002;

  const isLong = bias === "bullish";
  const entry = last;
  const stop = isLong ? entry - atr * 1.2 : entry + atr * 1.2;
  const target = isLong ? entry + atr * 2.4 : entry - atr * 2.4;
  return { entry, stop, target };
}

/** Stable payload when live feeds fail — uses synthetic OHLC, never empty */
export function neutralTechnicalPayload(asset) {
  const bars = getSyntheticHistory(asset, "4h", "1M");
  return buildTechnicalPayload(asset, bars);
}
