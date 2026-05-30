import React, { useMemo } from 'react';

function normalizeBars(data) {
  if (!Array.isArray(data)) return [];
  return data
    .map((b) => ({
      time: Number(b.time),
      open: Number(b.open),
      high: Number(b.high),
      low: Number(b.low),
      close: Number(b.close),
    }))
    .filter((b) => Number.isFinite(b.close))
    .sort((a, b) => a.time - b.time);
}

/**
 * Always-visible SVG candlesticks — fallback when TradingView embed is blocked or slow.
 */
const OhlcVisualChart = ({ data = [], height = 360, symbol = '', className = '' }) => {
  const bars = useMemo(() => normalizeBars(data).slice(-80), [data]);

  const layout = useMemo(() => {
    if (bars.length < 2) return null;
    const pad = { t: 12, r: 8, b: 22, l: 52 };
    const w = 800;
    const h = height;
    const chartW = w - pad.l - pad.r;
    const chartH = h - pad.t - pad.b;
    const lows = bars.map((b) => b.low);
    const highs = bars.map((b) => b.high);
    let min = Math.min(...lows);
    let max = Math.max(...highs);
    const span = max - min || max * 0.01 || 1;
    min -= span * 0.05;
    max += span * 0.05;
    const yScale = (v) => pad.t + chartH - ((v - min) / (max - min)) * chartH;
    const step = chartW / bars.length;
    const bodyW = Math.max(2, step * 0.55);

    const candles = bars.map((b, i) => {
      const x = pad.l + i * step + step / 2;
      const up = b.close >= b.open;
      const top = yScale(Math.max(b.open, b.close));
      const bottom = yScale(Math.min(b.open, b.close));
      const wickTop = yScale(b.high);
      const wickBottom = yScale(b.low);
      return { x, top, bottom, wickTop, wickBottom, bodyW, up };
    });

    const last = bars[bars.length - 1];
    const fmt = (n) => {
      if (n >= 1000) return n.toFixed(0);
      if (n >= 10) return n.toFixed(2);
      return n.toFixed(4);
    };

    return { w, h, pad, candles, min, max, yScale, last, fmt, chartH, chartW };
  }, [bars, height]);

  if (!layout) {
    return (
      <div
        className={`ohlc-visual ohlc-visual--empty ${className}`}
        style={{ height }}
        aria-hidden
      >
        <div className="ohlc-visual__grid" />
        <p className="text-xs text-text-muted">Loading price visual…</p>
      </div>
    );
  }

  const { w, h, candles, last, fmt, pad, min, max, yScale, chartH } = layout;
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const price = min + (max - min) * (1 - f);
    const y = pad.t + chartH * f;
    return { y, price: fmt(price) };
  });

  return (
    <div className={`ohlc-visual ${className}`} style={{ height }} aria-label={`${symbol} chart`}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="ohlc-visual__svg"
        role="img"
      >
        <defs>
          <linearGradient id="ohlc-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#161b26" />
            <stop offset="100%" stopColor="#0d1117" />
          </linearGradient>
        </defs>
        <rect width={w} height={h} fill="url(#ohlc-bg)" />
        {gridLines.map((g) => (
          <g key={g.y}>
            <line
              x1={pad.l}
              y1={g.y}
              x2={w - pad.r}
              y2={g.y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
            <text
              x={pad.l - 6}
              y={g.y + 3}
              fill="rgba(161,161,170,0.9)"
              fontSize="9"
              textAnchor="end"
              fontFamily="ui-monospace, monospace"
            >
              {g.price}
            </text>
          </g>
        ))}
        {candles.map((c, i) => (
          <g key={i}>
            <line
              x1={c.x}
              y1={c.wickTop}
              x2={c.x}
              y2={c.wickBottom}
              stroke={c.up ? '#34d399' : '#f87171'}
              strokeWidth="1"
            />
            <rect
              x={c.x - c.bodyW / 2}
              y={Math.min(c.top, c.bottom)}
              width={c.bodyW}
              height={Math.max(1, Math.abs(c.bottom - c.top))}
              fill={c.up ? '#34d399' : '#f87171'}
              rx="0.5"
            />
          </g>
        ))}
      </svg>
      {symbol && (
        <span className="ohlc-visual__tag">
          {symbol} · {fmt(last.close)}
        </span>
      )}
    </div>
  );
};

export default OhlcVisualChart;
