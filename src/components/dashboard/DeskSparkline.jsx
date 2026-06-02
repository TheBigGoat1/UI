import React, { useMemo } from 'react';

/** Tiny inline sparkline for desk tables (purple default, green if rising). */
const DeskSparkline = ({ values = [], width = 56, height = 20, variant = 'purple' }) => {
  const path = useMemo(() => {
    const pts = values.filter((v) => Number.isFinite(v));
    if (pts.length < 2) return '';
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const span = max - min || 1;
    const step = width / (pts.length - 1);
    return pts
      .map((v, i) => {
        const x = i * step;
        const y = height - ((v - min) / span) * (height - 4) - 2;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [values, width, height]);

  const stroke = variant === 'green' ? '#34d399' : '#a78bfa';

  return (
    <svg
      className="desk-sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

export default DeskSparkline;
