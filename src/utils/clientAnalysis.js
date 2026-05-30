import {
  buildClientSyntheticHistory,
  formatIntervalLabel,
  normalizeOhlcRows,
} from './chartConfig.js';
import { resolveTimeframeStack, formatTfLabel } from './timeframeStack.js';

function computeRSI(closes, period = 14) {
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

function trendOfSeries(bars) {
  if (!bars || bars.length < 5) return 'NEUTRAL';
  const closes = bars.map((b) => b.close);
  const split = Math.max(2, Math.floor(closes.length * 0.35));
  const early = closes.slice(0, split);
  const earlyAvg = early.reduce((a, b) => a + b, 0) / early.length;
  const last = closes[closes.length - 1];
  const delta = earlyAvg ? (last - earlyAvg) / earlyAvg : 0;
  if (delta > 0.0025) return 'BULLISH';
  if (delta < -0.0025) return 'BEARISH';
  return 'NEUTRAL';
}

function combineTimeframeTrends(htfTrend, ltfTrend) {
  let bias = 'neutral';
  if (htfTrend === 'BULLISH' && ltfTrend !== 'BEARISH') bias = 'bullish';
  if (htfTrend === 'BEARISH' && ltfTrend !== 'BULLISH') bias = 'bearish';
  if (ltfTrend === 'BULLISH' && htfTrend === 'NEUTRAL') bias = 'bullish';
  if (ltfTrend === 'BEARISH' && htfTrend === 'NEUTRAL') bias = 'bearish';

  let alignment = 'MIXED';
  if (htfTrend === ltfTrend && htfTrend !== 'NEUTRAL') alignment = 'ALIGNED';
  else if (
    (htfTrend === 'BULLISH' && ltfTrend === 'BEARISH') ||
    (htfTrend === 'BEARISH' && ltfTrend === 'BULLISH')
  ) {
    alignment = 'CONFLICTING';
  }

  const strength =
    htfTrend === ltfTrend && htfTrend !== 'NEUTRAL'
      ? 18
      : alignment === 'CONFLICTING'
        ? -12
        : 6;
  const confidence = Math.min(92, Math.max(48, 58 + strength));

  return { bias, confidence, alignment, htf: { trend: htfTrend }, ltf: { trend: ltfTrend } };
}

function computeSwingLevels(bars) {
  const slice = bars.slice(-30);
  if (!slice.length) return { support: null, resistance: null, last: null };
  const highs = slice.map((b) => b.high);
  const lows = slice.map((b) => b.low);
  const last = slice[slice.length - 1].close;
  return {
    support: Math.min(...lows),
    resistance: Math.max(...highs),
    last,
  };
}

function computeVolatility(bars) {
  const closes = bars.map((b) => b.close);
  if (closes.length < 5) return { state: 'NORMAL', atrPct: 0.35 };
  const ranges = [];
  for (let i = 1; i < closes.length; i += 1) {
    ranges.push(Math.abs(closes[i] - closes[i - 1]));
  }
  const atr = ranges.slice(-14).reduce((a, b) => a + b, 0) / Math.min(14, ranges.length);
  const last = closes[closes.length - 1];
  const atrPct = last ? (atr / last) * 100 : 0.35;
  let state = 'NORMAL';
  if (atrPct > 1.2) state = 'HIGH';
  else if (atrPct < 0.25) state = 'LOW';
  return { state, atrPct: Number(atrPct.toFixed(3)) };
}

function buildSummary(asset, analysis, rsi, volatility, levels, tfLabels) {
  const biasLabel = analysis.bias.toUpperCase();
  const rsiNote =
    rsi >= 70 ? 'RSI stretched high' : rsi <= 30 ? 'RSI stretched low' : 'RSI balanced';
  const alignNote =
    analysis.alignment === 'ALIGNED'
      ? 'timeframes aligned'
      : analysis.alignment === 'CONFLICTING'
        ? 'HTF vs chart divergence — size down'
        : 'mixed structure';
  return `${asset} · ${tfLabels.ltf}: ${biasLabel} (${analysis.confidence}%). ${alignNote}. ${rsiNote}, ${volatility.state.toLowerCase()} volatility. Support ${levels.support?.toFixed(5) ?? '—'}, resistance ${levels.resistance?.toFixed(5) ?? '—'}.`;
}

/** Build full analysis bundle locally — never blank. */
export function buildClientAnalysisBundle(symbol, interval = '4h', period = '1M', basePrice = 100) {
  const key = String(symbol || 'EURUSD')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const stack = resolveTimeframeStack(interval, period);

  const chartBars = normalizeOhlcRows(
    buildClientSyntheticHistory(key, stack.chart.interval, stack.chart.period, basePrice),
  );
  const htfBars = normalizeOhlcRows(
    buildClientSyntheticHistory(key, stack.htf.interval, stack.htf.period, basePrice),
  );

  const htfTrend = trendOfSeries(htfBars);
  const ltfTrend = trendOfSeries(chartBars);
  const analysis = combineTimeframeTrends(htfTrend, ltfTrend);
  const closes = chartBars.map((b) => b.close);
  const rsi = computeRSI(closes);
  const levels = computeSwingLevels(chartBars);
  const volatility = computeVolatility(chartBars);
  const momentumState = rsi >= 70 ? 'OVERBOUGHT' : rsi <= 30 ? 'OVERSOLD' : 'NEUTRAL';

  const tfLabels = {
    htf: `${formatTfLabel(stack.htf.interval)} · ${stack.htf.period}`,
    ltf: `${formatIntervalLabel(stack.chart.interval)} · ${stack.chart.period}`,
  };

  const technical = {
    asset: key,
    modules: {
      marketStructure: {
        htf: { trend: htfTrend, label: tfLabels.htf },
        ltf: { trend: ltfTrend, label: tfLabels.ltf },
        alignment: analysis.alignment,
      },
      momentum: { rsi, state: momentumState },
      volatility,
      levels,
    },
    bias: analysis.bias,
    confidence: analysis.confidence,
    summary: buildSummary(key, analysis, rsi, volatility, levels, tfLabels),
    barCount: chartBars.length,
  };

  return {
    symbol: key,
    technical,
    timeframe: {
      chart: stack.chart,
      htf: stack.htf,
      chartLabel: tfLabels.ltf,
      htfLabel: tfLabels.htf,
    },
    profile: null,
    meta: {
      asOf: new Date().toISOString(),
      barCount: chartBars.length,
      dataQuality: 'local',
      source: 'client-fallback',
    },
  };
}

/** Merge API history bars into analysis when full bundle failed */
export function buildAnalysisFromBars(symbol, chartBars, htfBars, interval, period) {
  const key = String(symbol || 'EURUSD')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const stack = resolveTimeframeStack(interval, period);
  const chart = normalizeOhlcRows(chartBars);
  const htf = normalizeOhlcRows(htfBars.length ? htfBars : chartBars);

  if (chart.length < 5) {
    return buildClientAnalysisBundle(key, interval, period).technical;
  }

  const htfTrend = trendOfSeries(htf);
  const ltfTrend = trendOfSeries(chart);
  const analysis = combineTimeframeTrends(htfTrend, ltfTrend);
  const closes = chart.map((b) => b.close);
  const rsi = computeRSI(closes);
  const levels = computeSwingLevels(chart);
  const volatility = computeVolatility(chart);
  const momentumState = rsi >= 70 ? 'OVERBOUGHT' : rsi <= 30 ? 'OVERSOLD' : 'NEUTRAL';

  const tfLabels = {
    htf: `${formatTfLabel(stack.htf.interval)} · ${stack.htf.period}`,
    ltf: `${formatIntervalLabel(stack.chart.interval)} · ${stack.chart.period}`,
  };

  return {
    asset: key,
    modules: {
      marketStructure: {
        htf: { trend: htfTrend, label: tfLabels.htf },
        ltf: { trend: ltfTrend, label: tfLabels.ltf },
        alignment: analysis.alignment,
      },
      momentum: { rsi, state: momentumState },
      volatility,
      levels,
    },
    bias: analysis.bias,
    confidence: analysis.confidence,
    summary: buildSummary(key, analysis, rsi, volatility, levels, tfLabels),
    barCount: chart.length,
  };
}
