import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Brain } from 'lucide-react';
import MrktChartInteractionLayer from './MrktChartInteractionLayer.jsx';
import MrktChartNewsLabel from './MrktChartNewsLabel.jsx';
import {
  computeChartPriceRange,
  priceToYPercent,
  distributeLevelLines,
} from '../../utils/chartLayout.js';

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
    const fromBars = computeChartPriceRange(chartBars, [s, r, p]);
    return { ...fromBars, support: s, resistance: r, price: p };
  }, [price, support, resistance, chartBars]);

  const markers = useMemo(() => {
    if (!annotations.length) return [];
    return annotations;
  }, [annotations]);

  const chartEvents = useMemo(() => {
    if (!showCalendarEvents || !calendarEvents.length) return [];
    return calendarEvents.filter((ev) => ev?.label || ev?.event_name || ev?.event);
  }, [showCalendarEvents, calendarEvents]);

  const levelLines = useMemo(() => {
    if (!showTargets) return [];
    const raw = [
      {
        id: 'target',
        y: priceToYPercent(range.resistance, range.min, range.max),
        type: 'target',
        label: `Target Level: $${Number(range.resistance).toFixed(2)}`,
      },
      {
        id: 'pullback',
        y: priceToYPercent(range.support, range.min, range.max),
        type: 'pullback',
        label: `Pullback Area: $${Number(range.support).toFixed(2)}`,
      },
      {
        id: 'live',
        y: priceToYPercent(range.price, range.min, range.max),
        type: 'live',
        label: Number(range.price).toFixed(2),
      },
    ];
    return distributeLevelLines(raw, 8);
  }, [showTargets, range]);

  const clearHoverSoon = () => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      setHoverId(null);
      setHoverLevel(null);
    }, 180);
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

  const targetLine = levelLines.find((l) => l.id === 'target');
  const supportLine = levelLines.find((l) => l.id === 'pullback');
  const liveLine = levelLines.find((l) => l.id === 'live');
  const targetY = targetLine?.y ?? 50;
  const supportY = supportLine?.y ?? 50;
  const liveY = liveLine?.y ?? 50;
  const pullbackBandTop = Math.min(supportY, targetY);
  const pullbackBandBottom = Math.max(supportY, targetY);

  const activeLabelId = hoverId || pinnedId;

  const handleMarkerClick = (marker, e) => {
    e.stopPropagation();
    setPinnedId(marker.id);
    const payload = marker.item || marker;
    onMarkerSelect?.(payload);
    onCandleOpen?.(
      payload?.title
        ? { ...payload, bar: marker.bar || payload.bar }
        : buildSessionHeadline(),
    );
  };

  const buildSessionHeadline = () => ({
    title: headlineNewsTitle(symbol, range.price),
    description: `Live ${symbol} session analysis at ${Number(range.price).toFixed(2)}`,
    publishedAt: new Date().toISOString(),
    source: 'chart_tap',
  });

  const openSessionAnalysis = (e) => {
    e?.stopPropagation();
    const activeMarker = markers.find((m) => m.id === activeLabelId);
    const payload = activeMarker?.item || buildSessionHeadline();
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
          suppressHover={showLabels}
        />
      )}

      {onChartTap && !chartBars.length && (
        <button
          type="button"
          className="mrkt-chart-tap-layer"
          aria-label="Open candle analysis for this chart"
          onClick={(e) => {
            if (e.target.closest('.mrkt-chart-marker, .mrkt-brain-prompt, .mrkt-news-label__float')) return;
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
            className="mrkt-chart-outside-label mrkt-chart-outside-label--calendar"
            style={{ top: `${ev.top}%`, left: `${ev.left}%` }}
            title={ev.label}
          >
            <span className="mrkt-chart-outside-label__pill">{ev.label}</span>
            <span className="mrkt-chart-outside-label__tick" aria-hidden />
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
            <span
              className={`mrkt-level-line__label mrkt-level-line__label--target mrkt-level-line__label--${targetLine?.labelSide || 'right'}`}
            >
              {targetLine?.label}
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
            <span
              className={`mrkt-level-line__label mrkt-level-line__label--live mrkt-level-line__label--${liveLine?.labelSide || 'right'}`}
            >
              {liveLine?.label}
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
          <div className="mrkt-chart-markers mrkt-chart-markers--news" onMouseLeave={clearHoverSoon}>
            {markers.map((m) => (
              <MrktChartNewsLabel
                key={m.id}
                marker={m}
                active={activeLabelId === m.id}
                onEnter={() => enterMarker(m)}
                onLeave={clearHoverSoon}
                onClick={(e) => handleMarkerClick(m, e)}
              />
            ))}
          </div>

          {markers.length === 0 && (
            <div className="mrkt-chart-labels-hint">
              <span>Syncing headlines — hover purple dots when they appear on candles</span>
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
