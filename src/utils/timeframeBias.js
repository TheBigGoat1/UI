/**
 * Timeframe-aware bias — chart interval drives session thresholds and client confidence copy.
 */
import { resolveTimeframeStack, formatTfLabel, normalizeInterval } from './timeframeStack.js';
import { formatChangePercent, formatTrend, formatStructure } from './displayFormat.js';

/** Session % gates scale with chart timeframe (1m reacts faster than 4h). */
export function sessionThresholds(chartInterval = '1h') {
  const iv = normalizeInterval(chartInterval);
  const map = {
    '1m': { soft: 0.025, hard: 0.07 },
    '5m': { soft: 0.035, hard: 0.09 },
    '15m': { soft: 0.045, hard: 0.11 },
    '30m': { soft: 0.055, hard: 0.13 },
    '1h': { soft: 0.065, hard: 0.16 },
    '4h': { soft: 0.1, hard: 0.28 },
    '1day': { soft: 0.15, hard: 0.4 },
    '1week': { soft: 0.25, hard: 0.55 },
  };
  return map[iv] || map['1h'];
}

function normBias(b) {
  const v = String(b || 'neutral').toLowerCase();
  if (v === 'bullish' || v === 'bull') return 'bullish';
  if (v === 'bearish' || v === 'bear') return 'bearish';
  return 'neutral';
}

function trendToBias(trend) {
  const t = String(trend || '').toUpperCase();
  if (t === 'BULLISH') return 'bullish';
  if (t === 'BEARISH') return 'bearish';
  return 'neutral';
}

/**
 * Resolve bias using chart TF + HTF stack + live session %.
 */
export function resolveTimeframeBias({
  baseBias = 'neutral',
  chartInterval = '1h',
  chartPeriod = '1W',
  changePercent,
  htfTrend,
  ltfTrend,
  alignment,
}) {
  const { soft, hard } = sessionThresholds(chartInterval);
  const ch = Number(changePercent);
  const hasCh = Number.isFinite(ch);
  const htf = trendToBias(htfTrend);
  const ltf = trendToBias(ltfTrend);
  let bias = normBias(baseBias);
  let confidenceNote = '';

  if (hasCh) {
    if (ch <= -hard) bias = 'bearish';
    else if (ch >= hard) bias = 'bullish';
    else if (ch <= -soft) {
      if (bias !== 'bearish') bias = htf === 'bullish' ? 'neutral' : 'bearish';
    } else if (ch >= soft) {
      if (bias !== 'bullish') bias = htf === 'bearish' ? 'neutral' : 'bullish';
    }
  }

  const align = String(alignment || '').toUpperCase();
  if (align === 'CONFLICTING') {
    confidenceNote =
      'Chart timeframe disagrees with higher timeframe — bias is provisional until alignment returns.';
    if (htf === 'bearish' && ltf === 'bullish') bias = 'neutral';
    if (htf === 'bullish' && ltf === 'bearish') bias = 'neutral';
  } else if (align === 'ALIGNED') {
    if (htf === 'bullish' && ltf === 'bullish') bias = 'bullish';
    if (htf === 'bearish' && ltf === 'bearish') bias = 'bearish';
    confidenceNote = 'Chart and higher timeframe are aligned — higher conviction on the directional read.';
  } else if (htf === 'bearish' && ltf !== 'bullish') {
    bias = bias === 'bullish' ? 'neutral' : 'bearish';
  } else if (htf === 'bullish' && ltf !== 'bearish') {
    bias = bias === 'bearish' ? 'neutral' : 'bullish';
  }

  const stack = resolveTimeframeStack(chartInterval, chartPeriod);
  const chartLabel = `${formatTfLabel(chartInterval)} · ${chartPeriod}`;
  const htfLabel = `${formatTfLabel(stack.htf.interval)} · ${stack.htf.period}`;

  return {
    bias,
    chartLabel,
    htfLabel,
    htfTrend: formatTrend(htfTrend),
    ltfTrend: formatTrend(ltfTrend),
    alignment: formatStructure(alignment),
    sessionMove: hasCh ? formatChangePercent(ch) : formatChangePercent(0),
    confidenceNote,
    thresholds: { soft, hard },
  };
}

export function buildTimeframeBiasSummary(ctx, technicalSummary = '') {
  const parts = [
    `Chart ${ctx.chartLabel}: ${ctx.ltfTrend} · HTF ${ctx.htfLabel}: ${ctx.htfTrend} · Structure ${ctx.alignment}.`,
    `Session ${ctx.sessionMove} on tape.`,
  ];
  if (ctx.confidenceNote) parts.push(ctx.confidenceNote);
  if (technicalSummary) parts.push(technicalSummary);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}
