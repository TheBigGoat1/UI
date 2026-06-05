import React from 'react';

/** Purple dot on candle + MRKT hover label (timestamp, session, headline) with dotted connector */
const MrktChartNewsLabel = ({
  marker,
  active,
  onEnter,
  onLeave,
  onClick,
}) => {
  const anchorX = marker.anchorX ?? marker.left ?? 50;
  const anchorY = marker.anchorY ?? marker.top ?? 50;
  const labelX = marker.labelX ?? anchorX + 8;
  const labelY = marker.labelY ?? (marker.side === 'below' ? anchorY + 14 : anchorY - 14);
  const side = marker.side || 'above';

  return (
    <>
      <button
        type="button"
        className={`mrkt-chart-marker mrkt-chart-marker--purple ${
          active ? 'mrkt-chart-marker--hover mrkt-chart-marker--active' : ''
        }`}
        style={{ left: `${anchorX}%`, top: `${anchorY}%` }}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onClick={onClick}
        aria-label={marker.text ? `News: ${marker.text}` : 'Chart news marker'}
        aria-expanded={active}
      />

      {active && (
        <>
          <svg
            className="mrkt-news-label__connector"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <line
              x1={anchorX}
              y1={anchorY}
              x2={labelX}
              y2={labelY}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div
            className={`mrkt-news-label__float mrkt-news-label__float--${side}`}
            style={{ left: `${labelX}%`, top: `${labelY}%` }}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            role="tooltip"
          >
            {marker.sub && <p className="mrkt-news-label__meta">{marker.sub}</p>}
            <p className="mrkt-news-label__headline">{marker.text}</p>
          </div>
        </>
      )}
    </>
  );
};

export default MrktChartNewsLabel;
