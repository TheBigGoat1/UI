import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Brain } from 'lucide-react';
import MrktChartInteractionLayer from './MrktChartInteractionLayer.jsx';

function priceY(price, min, max) {
  if (!Number.isFinite(price) || max <= min) return 50;
  const pct = ((max - price) / (max - min)) * 100;
  return Math.min(90, Math.max(10, pct));
}

const DEFAULT_MARKER_POSITIONS = [
  { left: 22, topOffset: 0.004 },
  { left: 38, topOffset: -0.002 },
  { left: 55, topOffset: 0.003 },
  { left: 68, topOffset: -0.004 },
  { left: 78, topOffset: 0.001 },
];

function BrainHoverPrompt({ style, visible, onClick }) {
  if (!visible) return null;
  return (
    <button
      type="button"
      className="mrkt-brain-prompt mrkt-brain-prompt--hover"
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <Brain size={14} aria-hidden />
      <span>What can push price here?</span>
    </button>
  );
}

function MarkerCallout({ marker, onOpenAnalysis, onKeepOpen, onClose }) {
  const summary = marker.item?.description || marker.item?.summary || null;
  const hasNews = Boolean(marker.item?.title);

  return (
    <div
      className="mrkt-chart-callout mrkt-chart-callout--open"
      style={{ top: `${marker.top}%`, left: `${marker.left}%` }}
      onMouseEnter={onKeepOpen}
      onMouseLeave={onClose}
      onClick={(e) => e.stopPropagation()}
      role="tooltip"
    >
      <span className="mrkt-chart-callout__line" aria-hidden />
      <div className="mrkt-chart-callout__box">
        {marker.sub && <span className="mrkt-chart-callout__sub">{marker.sub}</span>}
        <p className="mrkt-chart-callout__title">{marker.text}</p>
        {summary && <p className="mrkt-chart-callout__summary">{summary}</p>}
        {hasNews && onOpenAnalysis ? (
          <button
            type="button"
            className="mrkt-chart-callout__cta"
            onClick={(e) => {
              e.stopPropagation();
              onOpenAnalysis(marker.item);
            }}
          >
            <Brain size={12} aria-hidden />
            Open candle analysis
          </button>
        ) : (
          <span className="mrkt-chart-callout__hint">Click for full session analysis</span>
        )}
      </div>
    </div>
  );
}

const MrktChartOverlays = ({
  showLabels,
  showTargets,
  showCalendarEvents = false,
  price,
  support,
  resistance,
  symbol,
  annotations = [],
  calendarEvents = [],
  chartBars = [],
  chartInterval = '1h',
  newsPool = [],
  isLiveTape = true,
  onMarkerSelect,
  onCandleOpen,
  onChartTap,
  candleAnalysisOpen = false,
}) => {
  const [hoverId, setHoverId] = useState(null);
  const [pinnedId, setPinnedId] = useState(null);
  const [hoverLevel, setHoverLevel] = useState(null);
  const hoverTimer = useRef(null);

  const range = useMemo(() => {
    const p = Number(price) || 4500;
    const s = Number(support) || p * 0.99;
    const r = Number(resistance) || p * 1.01;
    const min = Math.min(s, p) * 0.988;
    const max = Math.max(r, p) * 1.012;
    return { min, max, support: s, resistance: r, price: p };
  }, [price, support, resistance]);

  const markers = useMemo(() => {
    if (annotations.length) {
      return annotations.map((a, i) => ({
        id: a.id || `m-${i}`,
        left: a.left ?? 30 + i * 12,
        top: a.top ?? priceY(range.price, range.min, range.max),
        text: a.text,
        sub: a.sub,
        variant: a.item ? 'purple' : i % 2 === 0 ? 'purple' : 'red',
        item: a.item,
      }));
    }
    if (!showLabels) return [];
    return DEFAULT_MARKER_POSITIONS.map((pos, i) => ({
      id: `default-${i}`,
      left: pos.left,
      top: priceY(range.price * (1 + pos.topOffset), range.min, range.max),
      text:
        i === 0
          ? 'What can push price here?'
          : `${symbol || 'XAUUSD'} — session catalyst near this level`,
      sub: i === 0 ? 'Session recap · key catalysts' : undefined,
      variant: i % 2 === 0 ? 'purple' : 'red',
    }));
  }, [annotations, showLabels, range, symbol]);

  const chartEvents = useMemo(() => {
    if (!showCalendarEvents || !calendarEvents.length) return [];
    return calendarEvents.slice(0, 6).map((ev, i) => ({
      id: ev.id || `cal-${i}`,
      left: 18 + i * 14,
      label: (ev.event_name || ev.event || 'Event').slice(0, 12),
      impact: ev.importance || ev.impact,
    }));
  }, [showCalendarEvents, calendarEvents]);

  const clearHoverSoon = () => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      setHoverId(null);
      setHoverLevel(null);
    }, 160);
  };

  const keepHover = () => clearTimeout(hoverTimer.current);

  const enterMarker = (marker) => {
    keepHover();
    setHoverId(marker.id);
    setHoverLevel(null);
  };

  useEffect(() => {
    if (!showLabels) {
      setHoverId(null);
      setPinnedId(null);
    }
  }, [showLabels, symbol]);

  useEffect(() => {
    if (!candleAnalysisOpen) setPinnedId(null);
  }, [candleAnalysisOpen]);

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setHoverId(null);
        setPinnedId(null);
        setHoverLevel(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const supportY = priceY(range.support, range.min, range.max);
  const targetY = priceY(range.resistance, range.min, range.max);
  const liveY = priceY(range.price, range.min, range.max);
  const pullbackBandTop = Math.min(supportY, targetY);
  const pullbackBandBottom = Math.max(supportY, targetY);

  const calloutId = hoverId || pinnedId;
  const calloutMarker = markers.find((m) => m.id === calloutId);

  const handleMarkerClick = (marker, e) => {
    e.stopPropagation();
    setPinnedId(marker.id);
    const payload = marker.item || marker;
    onMarkerSelect?.(payload);
    onCandleOpen?.(payload?.title ? payload : buildSessionHeadline());
  };

  const buildSessionHeadline = () => ({
    title: headlineNewsTitle(symbol, range.price),
    description: `Live ${symbol} session analysis at ${Number(range.price).toFixed(2)}`,
    publishedAt: new Date().toISOString(),
    source: 'chart_tap',
  });

  const openSessionAnalysis = (e) => {
    e?.stopPropagation();
    const payload = calloutMarker?.item || buildSessionHeadline();
    onCandleOpen?.(payload);
  };

  if (!showLabels && !showTargets && !chartEvents.length && chartBars.length < 2) return null;

  return (
    <div className="mrkt-chart-overlays" aria-hidden={!showLabels && !showTargets}>
      {chartBars.length >= 2 && onCandleOpen && (
        <MrktChartInteractionLayer
          bars={chartBars}
          interval={chartInterval}
          symbol={symbol}
          newsPool={newsPool}
          isLiveTape={isLiveTape}
          onCandleOpen={onCandleOpen}
        />
      )}

      {onChartTap && !chartBars.length && (
        <button
          type="button"
          className="mrkt-chart-tap-layer"
          aria-label="Open candle analysis for this chart"
          onClick={(e) => {
            if (e.target.closest('.mrkt-chart-marker, .mrkt-brain-prompt, .mrkt-chart-callout')) return;
            e.stopPropagation();
            onChartTap(buildSessionHeadline());
          }}
        />
      )}

      {onChartTap && chartBars.length >= 2 && (
        <button
          type="button"
          className="mrkt-chart-tap-layer mrkt-chart-tap-layer--passive"
          aria-hidden
          tabIndex={-1}
        />
      )}

      {showCalendarEvents &&
        chartEvents.map((ev) => (
          <div
            key={ev.id}
            className="mrkt-chart-cal-marker"
            style={{ left: `${ev.left}%` }}
            title={ev.label}
          >
            <span className="mrkt-chart-cal-marker__line" aria-hidden />
            <span className="mrkt-chart-cal-marker__pill">{ev.label}</span>
          </div>
        ))}

      {showTargets && (
        <>
          <div
            className="mrkt-level-band"
            style={{ top: `${pullbackBandTop}%`, height: `${Math.max(pullbackBandBottom - pullbackBandTop, 4)}%` }}
          >
            <span className="mrkt-level-band__label mrkt-level-band__label--pullback">Pullback Area</span>
          </div>
          <div
            className="mrkt-level-line mrkt-level-line--target"
            style={{ top: `${targetY}%` }}
            onMouseEnter={() => {
              keepHover();
              setHoverLevel('target');
            }}
            onMouseLeave={clearHoverSoon}
          >
            <span className="mrkt-level-line__label mrkt-level-line__label--target">
              Target Level: ${Number(range.resistance).toFixed(2)}
            </span>
          </div>
          <div
            className="mrkt-level-line mrkt-level-line--pullback"
            style={{ top: `${supportY}%` }}
            onMouseEnter={() => {
              keepHover();
              setHoverLevel('pullback');
            }}
            onMouseLeave={clearHoverSoon}
          />
          <div
            className="mrkt-level-line mrkt-level-line--live"
            style={{ top: `${liveY}%` }}
          >
            <span className="mrkt-level-line__label mrkt-level-line__label--live">
              {Number(range.price).toFixed(2)}
            </span>
          </div>
          <BrainHoverPrompt
            visible={hoverLevel === 'target'}
            style={{ top: `${Math.min(targetY + 2, 78)}%` }}
            onClick={openSessionAnalysis}
          />
          <BrainHoverPrompt
            visible={hoverLevel === 'pullback'}
            style={{ top: `${Math.max(supportY - 10, 12)}%` }}
            onClick={openSessionAnalysis}
          />
        </>
      )}

      {showLabels && (
        <>
          <div className="mrkt-chart-markers" onMouseLeave={clearHoverSoon}>
            {markers.map((m) => {
              const isHover = hoverId === m.id;
              const isPinned = pinnedId === m.id;
              const showBrain = isHover || isPinned;
              return (
                <React.Fragment key={m.id}>
                  <BrainHoverPrompt
                    visible={showBrain}
                    style={{
                      top: `${Math.max(m.top - 8, 6)}%`,
                      left: `${Math.max(m.left - 18, 4)}%`,
                    }}
                    onClick={() => onCandleOpen?.(m.item || buildSessionHeadline())}
                  />
                  <button
                    type="button"
                    className={`mrkt-chart-marker mrkt-chart-marker--${m.variant} ${
                      isHover || isPinned ? 'mrkt-chart-marker--hover' : ''
                    } ${isPinned ? 'mrkt-chart-marker--active' : ''}`}
                    style={{ left: `${m.left}%`, top: `${m.top}%` }}
                    onMouseEnter={() => enterMarker(m)}
                    onMouseLeave={clearHoverSoon}
                    onClick={(e) => handleMarkerClick(m, e)}
                    aria-label={
                      m.item?.title
                        ? `Headline: ${m.item.title}. Hover for brain prompt, click for analysis.`
                        : 'Show analysis at this price point'
                    }
                    aria-expanded={Boolean(calloutId === m.id)}
                  />
                </React.Fragment>
              );
            })}
          </div>

          {calloutMarker && (
            <MarkerCallout
              marker={calloutMarker}
              onOpenAnalysis={onCandleOpen}
              onKeepOpen={keepHover}
              onClose={clearHoverSoon}
            />
          )}

          {markers.length === 0 && (
            <div className="mrkt-chart-labels-hint">
              <span>Zoom in to show labels — or click chart for session analysis</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

function headlineNewsTitle(symbol, price) {
  return `Live ${symbol} chart read — price ${Number(price).toFixed(2)}`;
}

export default MrktChartOverlays;
