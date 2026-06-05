/** Client-side instant candle read — shown while Claude/API loads (no blank spinner). */
export function buildInstantCandlePreview({
  symbol,
  headline = {},
  marketContext = {},
  relatedNewsPool = [],
}) {
  const title = headline?.title || headline?.text || '';
  const summary = headline?.description || headline?.summary || '';
  const led = (relatedNewsPool || [])
    .filter((n) => n?.title && n.title !== title)
    .slice(0, 4)
    .map((n) => {
      const t = n.publishedAt || n.time;
      const when = t
        ? new Date(t).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })
        : 'Earlier';
      return `${when} — ${n.title}`;
    });

  const bias = marketContext?.bias || 'neutral';
  const ch = marketContext?.change_pct;
  const chStr = Number.isFinite(Number(ch))
    ? `${Number(ch) >= 0 ? '+' : ''}${Number(ch).toFixed(2)}%`
    : null;

  return {
    symbol,
    publishedAt: headline?.publishedAt || headline?.time || null,
    whatHappened: {
      summary: summary || title || `${symbol} session structure (${bias} bias)`,
      bullets: chStr ? [`Session move ${chStr} on ${symbol}.`] : [],
    },
    whatLedToThis: {
      summary: led.length ? 'Recent wire before this point:' : 'Pulling live headlines…',
      bullets: led,
    },
    technicals:
      marketContext?.technical_summary ||
      `${symbol} ${marketContext?.interval || '1h'} read — HTF ${marketContext?.htfTrend || '—'}, LTF ${marketContext?.ltfTrend || '—'}. Support ${marketContext?.support ?? '—'}, resistance ${marketContext?.resistance ?? '—'}.`,
    relatedNews: (relatedNewsPool || [])
      .filter((n) => n?.title)
      .slice(0, 6)
      .map((n) => ({
        title: n.title,
        summary: n.description || n.summary,
        publishedAt: n.publishedAt || n.time,
        url: n.url || n.link,
      })),
    relatedEvents: [],
    provider: 'instant',
    data_quality: marketContext?.data_quality || 'live',
  };
}
