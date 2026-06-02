/**
 * Merge live websocket/REST session % into desk technical bias (forex moves constantly).
 */

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
 * @param {object} technical - analysis technical bundle
 * @param {{ changePercent?: number, ltfTrend?: string, htfTrend?: string }} live
 */
export function applyLiveSessionBias(technical, live = {}) {
  if (!technical) return technical;

  const ch = Number(live.changePercent);
  const hasCh = Number.isFinite(ch);
  const ltf = trendToBias(live.ltfTrend);
  const htf = trendToBias(live.htfTrend);
  let bias = normBias(technical.bias);

  if (hasCh) {
    if (ch <= -0.12) bias = 'bearish';
    else if (ch >= 0.12) bias = 'bullish';
    else if (ch <= -0.04) {
      if (bias === 'neutral' || bias === 'bullish') bias = 'bearish';
    } else if (ch >= 0.04) {
      if (bias === 'neutral' || bias === 'bearish') bias = 'bullish';
    }
  }

  if (ltf === 'bearish' && htf !== 'bullish') bias = 'bearish';
  if (ltf === 'bullish' && htf !== 'bearish') bias = 'bullish';
  if (ltf === 'bearish' && htf === 'bearish') bias = 'bearish';
  if (ltf === 'bullish' && htf === 'bullish') bias = 'bullish';

  const chStr = hasCh ? `${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%` : '—';
  const liveNote = hasCh
    ? `Live session ${chStr} on tape`
    : 'Live tape updating';

  let summary = technical.summary || '';
  if (hasCh && Math.abs(ch) >= 0.03) {
    const tone =
      bias === 'bearish'
        ? 'Session flow is bearish'
        : bias === 'bullish'
          ? 'Session flow is bullish'
          : 'Session is mixed';
    summary = `${tone} (${chStr}). ${summary}`.trim();
  }

  return {
    ...technical,
    bias,
    summary,
    liveSession: { changePercent: hasCh ? ch : null, note: liveNote },
  };
}
