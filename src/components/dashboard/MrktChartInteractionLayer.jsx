import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MrktChartCandleHover from './MrktChartCandleHover.jsx';
import {
  barIndexFromX,
  buildCandleHoverRead,
  computeBarLayout,
  headlineFromCandleRead,
} from '../../utils/chartCandleIntel.js';

const MrktChartInteractionLayer = ({
  bars = [],
  interval = '1h',
  symbol,
  newsPool = [],
  isLiveTape = true,
  onCandleOpen,
}) => {
  const wrapRef = useRef(null);
  const layerRef = useRef(null);
  const hoverTimer = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);
  const [pinnedIdx, setPinnedIdx] = useState(null);

  const layout = useMemo(() => computeBarLayout(bars, 400), [bars]);

  const read = useMemo(() => {
    const idx = pinnedIdx ?? hoverIdx;
    if (idx == null || !layout?.columns?.[idx]) return null;
    const col = layout.columns[idx];
    const prev = layout.columns[idx - 1]?.bar;
    return buildCandleHoverRead({
      bar: col.bar,
      prevBar: prev,
      symbol,
      interval,
      newsPool,
      isLiveTape,
    });
  }, [pinnedIdx, hoverIdx, layout, symbol, interval, newsPool, isLiveTape]);

  const clearHoverSoon = useCallback(() => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHoverIdx(null), 220);
  }, []);

  const keepHover = useCallback(() => clearTimeout(hoverTimer.current), []);

  const handleWrapLeave = useCallback(
    (e) => {
      const next = e.relatedTarget;
      if (next && wrapRef.current?.contains(next)) return;
      clearHoverSoon();
    },
    [clearHoverSoon],
  );

  const updateHoverFromEvent = useCallback(
    (e) => {
      if (!layout?.barCount) return;
      const rect = layerRef.current?.getBoundingClientRect();
      if (!rect?.width) return;
      const padL = (layout.padLeftPct / 100) * rect.width;
      const padR = (layout.padRightPct / 100) * rect.width;
      const innerW = rect.width - padL - padR;
      const x = e.clientX - rect.left - padL;
      const xPct = innerW > 0 ? x / innerW : 0;
      const idx = barIndexFromX(xPct, layout.barCount);
      keepHover();
      setHoverIdx(idx);
    },
    [layout, keepHover],
  );

  const openAnalysis = useCallback(() => {
    if (!read) return;
    const headline = headlineFromCandleRead(read, symbol);
    onCandleOpen?.(headline);
  }, [read, symbol, onCandleOpen]);

  const handleClick = useCallback(
    (e) => {
      if (e.target.closest('.mrkt-candle-hover')) return;
      updateHoverFromEvent(e);
      const rect = layerRef.current?.getBoundingClientRect();
      if (!rect?.width || !layout?.barCount) return;
      const padL = (layout.padLeftPct / 100) * rect.width;
      const padR = (layout.padRightPct / 100) * rect.width;
      const innerW = rect.width - padL - padR;
      const x = e.clientX - rect.left - padL;
      const xPct = innerW > 0 ? x / innerW : 0;
      const idx = barIndexFromX(xPct, layout.barCount);
      setPinnedIdx(idx);
      const col = layout.columns[idx];
      const prev = layout.columns[idx - 1]?.bar;
      const clickRead = buildCandleHoverRead({
        bar: col.bar,
        prevBar: prev,
        symbol,
        interval,
        newsPool,
        isLiveTape,
      });
      onCandleOpen?.(headlineFromCandleRead(clickRead, symbol));
    },
    [updateHoverFromEvent, layout, symbol, interval, newsPool, isLiveTape, onCandleOpen],
  );

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  useEffect(() => {
    setHoverIdx(null);
    setPinnedIdx(null);
  }, [symbol, interval]);

  const activeCol = layout?.columns?.[pinnedIdx ?? hoverIdx];
  const hoverStyle = activeCol
    ? {
        left: `${Math.min(Math.max(activeCol.leftPct, 12), 68)}%`,
        top: `${Math.min(Math.max(activeCol.topPct - 2, 4), 48)}%`,
      }
    : undefined;

  if (!bars.length || bars.length < 2) return null;

  return (
    <div
      ref={wrapRef}
      className="mrkt-chart-interaction-wrap"
      onMouseLeave={handleWrapLeave}
    >
      <div
        ref={layerRef}
        className="mrkt-chart-interaction"
        aria-label="Candle hover analysis"
        onMouseMove={updateHoverFromEvent}
        onClick={handleClick}
      />
      {activeCol && (
        <div
          className="mrkt-chart-interaction__highlight"
          style={{
            left: `${((activeCol.index + 0.5) / layout.barCount) * 100}%`,
          }}
          aria-hidden
        />
      )}
      {read && hoverStyle && (
        <MrktChartCandleHover
          read={read}
          style={hoverStyle}
          onOpenAnalysis={openAnalysis}
          onKeepOpen={keepHover}
          onClose={clearHoverSoon}
        />
      )}
    </div>
  );
};

export default MrktChartInteractionLayer;
