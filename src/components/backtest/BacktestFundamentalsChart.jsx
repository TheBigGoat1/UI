import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  barIndexFromX,
  buildCandleHoverRead,
  computeBarLayout,
  headlineFromCandleRead,
} from '../../utils/chartCandleIntel.js';
import { formatCandleWindowLabel } from '../../utils/backtestFundamentals.js';

/** Chart interaction layer — wide selection band + auto-open analysis on click */
const BacktestFundamentalsChart = ({
  bars = [],
  interval = '1h',
  symbol,
  newsPool = [],
  isLiveTape = true,
  onCandleSelect,
}) => {
  const layerRef = useRef(null);
  const [pinnedIdx, setPinnedIdx] = useState(null);

  const layout = useMemo(() => computeBarLayout(bars, 420), [bars]);

  const selectBar = useCallback(
    (idx) => {
      if (idx == null || !layout?.columns?.[idx]) return;
      setPinnedIdx(idx);
      const col = layout.columns[idx];
      const prev = layout.columns[idx - 1]?.bar;
      const read = buildCandleHoverRead({
        bar: col.bar,
        prevBar: prev,
        symbol,
        interval,
        newsPool,
        isLiveTape,
      });
      const headline = headlineFromCandleRead(read, symbol);
      onCandleSelect?.({
        ...headline,
        bar: col.bar,
        read,
        windowLabel: formatCandleWindowLabel(col.bar, interval),
      });
    },
    [layout, symbol, interval, newsPool, isLiveTape, onCandleSelect],
  );

  const handleClick = useCallback(
    (e) => {
      if (!layout?.barCount) return;
      const rect = layerRef.current?.getBoundingClientRect();
      if (!rect?.width) return;
      const padL = (layout.padLeftPct / 100) * rect.width;
      const padR = (layout.padRightPct / 100) * rect.width;
      const innerW = rect.width - padL - padR;
      const x = e.clientX - rect.left - padL;
      const xPct = innerW > 0 ? x / innerW : 0;
      selectBar(barIndexFromX(xPct, layout.barCount));
    },
    [layout, selectBar],
  );

  useEffect(() => {
    setPinnedIdx(null);
  }, [symbol, interval, bars.length]);

  const didAutoSelect = useRef(false);
  useEffect(() => {
    didAutoSelect.current = false;
  }, [symbol, interval]);

  useEffect(() => {
    if (didAutoSelect.current || pinnedIdx != null || !layout?.barCount) return;
    didAutoSelect.current = true;
    selectBar(layout.barCount - 1);
  }, [layout?.barCount, pinnedIdx, selectBar]);

  const activeCol = pinnedIdx != null ? layout?.columns?.[pinnedIdx] : null;
  const bandWidthPct = layout?.barCount ? (100 / layout.barCount) * 0.92 : 0;

  if (!bars.length || bars.length < 2) return null;

  return (
    <div className="bt-fundamentals-chart-interaction">
      <div
        ref={layerRef}
        className="bt-fundamentals-chart-interaction__layer"
        aria-label="Select candle for fundamentals backtest"
        onClick={handleClick}
      />
      {activeCol && (
        <>
          <div
            className="bt-fundamentals-chart-interaction__band"
            style={{
              left: `${((activeCol.index + 0.5) / layout.barCount) * 100}%`,
              width: `${bandWidthPct}%`,
            }}
            aria-hidden
          />
          <div
            className="bt-fundamentals-chart-interaction__pill"
            style={{ left: `${Math.min(Math.max(activeCol.leftPct, 8), 72)}%` }}
          >
            {formatCandleWindowLabel(activeCol.bar, interval)}
          </div>
        </>
      )}
    </div>
  );
};

export default BacktestFundamentalsChart;
