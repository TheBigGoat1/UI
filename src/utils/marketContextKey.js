/** Stable key for API calls — avoids re-fetch flicker when object identity changes every tick. */
export function marketContextKey(ctx) {
  if (!ctx) return '';
  return [
    ctx.symbol,
    ctx.bias,
    ctx.data_quality,
    ctx.support,
    ctx.resistance,
    ctx.interval,
    ctx.htfTrend,
    ctx.ltfTrend,
  ].join('|');
}
