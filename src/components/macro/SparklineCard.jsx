import React, { useMemo, useRef, useState } from 'react';

function buildPath(points, width, height, pad = 4) {
  if (!points?.length) return { path: '', coords: [] };
  const vals = points.map((p) => Number(p.value)).filter(Number.isFinite);
  if (!vals.length) return { path: '', coords: [] };
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const coords = vals.map((v, i) => {
    const x = pad + (i / Math.max(vals.length - 1, 1)) * innerW;
    const y = pad + innerH - ((v - min) / span) * innerH;
    return { x, y, value: v };
  });
  const path = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' ');
  return { path, coords };
}

function formatPeriod(ts) {
  if (!ts) return '';
  const d = new Date(ts > 1e12 ? ts : ts * 1000);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

const SparklineCard = ({ name, valueLabel, changePercent, period, sparkline = [] }) => {
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null);
  const w = 280;
  const h = 72;
  const { path, coords } = useMemo(() => buildPath(sparkline, w, h), [sparkline]);

  const ch = Number(changePercent);
  const up = Number.isFinite(ch) && ch >= 0;
  const hasChange = Number.isFinite(ch);
  const changeTone = !hasChange
    ? 'ge-card__delta--flat'
    : up
      ? 'ge-card__delta--up'
      : 'ge-card__delta--down';

  const onMove = (e) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || !coords.length) return;
    const x = e.clientX - rect.left;
    const idx = Math.round((x / rect.width) * (coords.length - 1));
    const clamped = Math.max(0, Math.min(coords.length - 1, idx));
    const pt = sparkline[clamped];
    const c = coords[clamped];
    setHover({
      idx: clamped,
      x: c.x,
      y: c.y,
      xPct: (clamped / Math.max(coords.length - 1, 1)) * 100,
      label: formatPeriod(pt.time),
      value: Number(pt.value),
    });
  };

  return (
    <article className="ge-card">
      <div className="ge-card__head">
        <h4 className="ge-card__title">{name}</h4>
        <span className="ge-card__period">{period || '—'}</span>
      </div>
      <div className="ge-card__body">
        <span className="ge-card__value">{valueLabel ?? 'n/a'}</span>
        {hasChange && (
          <span className={`ge-card__delta ${changeTone}`}>
            {up ? '↑' : '↓'} {Math.abs(ch).toFixed(2)}%
          </span>
        )}
      </div>
      <div
        ref={wrapRef}
        className="ge-card__chart"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="ge-card__svg">
          {path && <path d={path} className="ge-card__line" fill="none" />}
          {hover && (
            <>
              <line
                x1={hover.x}
                x2={hover.x}
                y1={0}
                y2={h}
                className="ge-card__crosshair"
              />
              <circle cx={hover.x} cy={hover.y} r={4} className="ge-card__dot" />
            </>
          )}
        </svg>
        {hover && (
          <div className="ge-card__tip" style={{ left: `${hover.xPct}%` }}>
            <span className="ge-card__tip-date">{hover.label}</span>
            <span className="ge-card__tip-val">Actual : {hover.value.toFixed(2)}</span>
          </div>
        )}
      </div>
    </article>
  );
};

export default SparklineCard;
