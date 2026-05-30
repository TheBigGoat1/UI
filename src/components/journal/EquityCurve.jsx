import React, { useMemo } from 'react';

const EquityCurve = ({ trades = [] }) => {
  const { points, min, max, finalEquity } = useMemo(() => {
    const sorted = [...trades].sort(
      (a, b) => new Date(a.entryDate || 0) - new Date(b.entryDate || 0),
    );
    let equity = 0;
    const pts = sorted.map((t) => {
      equity += parseFloat(t.pnl) || 0;
      return { equity, date: t.entryDate };
    });
    if (pts.length < 2) {
      return { points: pts, min: 0, max: 0, finalEquity: equity };
    }
    const values = pts.map((p) => p.equity);
    return {
      points: pts,
      min: Math.min(...values, 0),
      max: Math.max(...values, 0),
      finalEquity: equity,
    };
  }, [trades]);

  if (points.length < 2) {
    return <p className="text-sm text-text-muted">Log trades to build your equity curve.</p>;
  }

  const width = 640;
  const height = 200;
  const pad = { top: 16, right: 12, bottom: 28, left: 48 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = pad.left + (i / (points.length - 1)) * innerW;
    const y = pad.top + innerH - ((p.equity - min) / range) * innerH;
    return { x, y, ...p };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(pad.top + innerH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(pad.top + innerH).toFixed(1)} Z`;
  const zeroY = pad.top + innerH - ((0 - min) / range) * innerH;
  const positive = finalEquity >= 0;

  return (
    <div className="rounded-xl border border-border bg-background/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-xs text-text-muted uppercase font-bold tracking-wider">Equity curve</p>
        <p className={`text-sm font-mono font-bold ${positive ? 'text-emerald-500' : 'text-red-500'}`}>
          {positive ? '+' : '-'}${Math.abs(finalEquity).toFixed(2)}
        </p>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label="Equity curve chart"
      >
        <line
          x1={pad.left}
          y1={zeroY}
          x2={width - pad.right}
          y2={zeroY}
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeDasharray="4 4"
        />
        <path d={areaPath} fill={positive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'} />
        <path
          d={linePath}
          fill="none"
          stroke={positive ? '#10b981' : '#ef4444'}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r="3"
            fill={positive ? '#10b981' : '#ef4444'}
            opacity={i === coords.length - 1 ? 1 : 0.5}
          >
            <title>{`${c.date ? new Date(c.date).toLocaleDateString() : ''}: $${c.equity.toFixed(2)}`}</title>
          </circle>
        ))}
        <text x={pad.left} y={height - 8} fill="currentColor" opacity="0.45" fontSize="10">
          Start
        </text>
        <text x={width - pad.right - 28} y={height - 8} fill="currentColor" opacity="0.45" fontSize="10">
          Latest
        </text>
        <text x={4} y={pad.top + 4} fill="currentColor" opacity="0.45" fontSize="10">
          ${max.toFixed(0)}
        </text>
        <text x={4} y={pad.top + innerH} fill="currentColor" opacity="0.45" fontSize="10">
          ${min.toFixed(0)}
        </text>
      </svg>
    </div>
  );
};

export default EquityCurve;
