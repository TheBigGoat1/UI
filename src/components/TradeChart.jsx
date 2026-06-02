import React, { useEffect, useRef, useState } from 'react';
import TradingViewChart from './TradingViewChart.jsx';

/**
 * Unified candlestick chart — TradingView Advanced Chart everywhere.
 * @param {string} symbol - Platform asset code (EURUSD, BTCUSD, …)
 * @param {string} interval - Platform interval (1m, 4h, 1day, …)
 * @param {boolean} [fill] - Stretch to parent height (uses ResizeObserver)
 */
const TradeChart = ({
  symbol,
  data,
  interval = '4h',
  levels = [],
  height = 400,
  interactive = true,
  compact = false,
  fill = false,
  modelMode = false,
  quotePrice = null,
  preferDataFeed = false,
  className = '',
}) => {
  const wrapRef = useRef(null);
  const [measuredHeight, setMeasuredHeight] = useState(height);

  const resolvedSymbol =
    symbol ||
    data?.[0]?.symbol ||
    (typeof data?.[0]?.asset === 'string' ? data[0].asset : null);

  useEffect(() => {
    if (!fill || !wrapRef.current) return undefined;

    const measure = () => {
      const h = wrapRef.current?.getBoundingClientRect().height;
      if (!h || h <= 0) return;
      const next = Math.max(compact ? 128 : 280, Math.floor(h));
      // Ignore tiny resize jitter to prevent chart remount flicker.
      setMeasuredHeight((prev) => (Math.abs(prev - next) >= 4 ? next : prev));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [fill, compact]);

  const chartHeight = fill ? measuredHeight : height;

  return (
    <div
      ref={wrapRef}
      className={`trade-chart-shell ${fill ? 'trade-chart-shell--fill' : ''} ${className}`}
    >
      <TradingViewChart
        symbol={resolvedSymbol}
        data={data}
        interval={interval}
        levels={levels}
        height={chartHeight}
        interactive={interactive}
        compact={compact}
        modelMode={modelMode}
        quotePrice={quotePrice}
        preferDataFeed={preferDataFeed}
        className={fill ? 'trade-chart-shell__chart' : className}
      />
    </div>
  );
};

export default TradeChart;
