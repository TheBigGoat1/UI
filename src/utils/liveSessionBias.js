/**
 * Merge live websocket/REST session % into desk technical bias (timeframe-aware).
 */
import { formatChangePercent } from './displayFormat.js';
import { resolveTimeframeBias, buildTimeframeBiasSummary } from './timeframeBias.js';

/**
 * @param {object} technical - analysis technical bundle
 * @param {{ changePercent?: number, ltfTrend?: string, htfTrend?: string, chartInterval?: string, chartPeriod?: string }} live
 */
export function applyLiveSessionBias(technical, live = {}) {
  if (!technical) return technical;

  const ms = technical.modules?.marketStructure;
  const ctx = resolveTimeframeBias({
    baseBias: technical.bias,
    chartInterval: live.chartInterval || '1h',
    chartPeriod: live.chartPeriod || '1W',
    changePercent: live.changePercent,
    htfTrend: live.htfTrend ?? ms?.htf?.trend,
    ltfTrend: live.ltfTrend ?? ms?.ltf?.trend,
    alignment: ms?.alignment,
  });

  const ch = Number(live.changePercent);
  const hasCh = Number.isFinite(ch);
  const chStr = hasCh ? formatChangePercent(ch) : formatChangePercent(0);
  const liveNote = hasCh
    ? `Live session ${chStr} on ${ctx.chartLabel} tape`
    : `Live tape updating on ${ctx.chartLabel}`;

  const summary = buildTimeframeBiasSummary(ctx, technical.summary || '');

  return {
    ...technical,
    bias: ctx.bias,
    summary,
    liveSession: { changePercent: hasCh ? ch : null, note: liveNote },
    timeframeContext: ctx,
  };
}
