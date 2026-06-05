import React, { useCallback, useMemo, useState } from 'react';
import MrktAssetDropdown from '../components/dashboard/MrktAssetDropdown.jsx';
import TradeChart from '../components/TradeChart.jsx';
import BacktestFundamentalsChart from '../components/backtest/BacktestFundamentalsChart.jsx';
import BacktestFundamentalsPanel from '../components/backtest/BacktestFundamentalsPanel.jsx';
import { useChartHistory } from '../hooks/useChartHistory.js';
import { useTerminalRealtime } from '../hooks/useTerminalRealtime.js';
import { useAssetAnalysis } from '../hooks/useAssetAnalysis.js';
import { useFeatureAccess } from '../hooks/useFeatureAccess.js';
import { filterBarsInRange, periodForDates } from '../utils/backtestFundamentals.js';
import { formatTfLabel } from '../utils/timeframeStack.js';

const TIMEFRAMES = [
  { label: '1H', interval: '1h', period: '1M' },
  { label: '4H', interval: '4h', period: '3M' },
];

function defaultDates() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 90);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

function formatDateRangeLabel(start, end) {
  const fmt = (d) =>
    new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

const BacktestFundamentals = () => {
  const access = useFeatureAccess();
  const [symbol, setSymbol] = useState('XAUUSD');
  const [chartConfig, setChartConfig] = useState(TIMEFRAMES[0]);
  const [dates, setDates] = useState(defaultDates);
  const [selectedCandle, setSelectedCandle] = useState(null);

  const period = useMemo(
    () => periodForDates(dates.start, dates.end),
    [dates.start, dates.end],
  );

  const { assetsList, prices, headlineNews } = useTerminalRealtime(symbol);
  const livePrice = prices[symbol]?.price;
  const { bars: rawBars, meta: chartMeta, isLiveTape } = useChartHistory(
    symbol,
    chartConfig.interval,
    period,
    livePrice,
  );

  const chartBars = useMemo(
    () => filterBarsInRange(rawBars, dates.start, dates.end),
    [rawBars, dates.start, dates.end],
  );

  const { technical, profile } = useAssetAnalysis(symbol, chartConfig.interval, period);

  const marketContext = useMemo(
    () => ({
      symbol,
      price: livePrice,
      changePercent: prices[symbol]?.changePercent,
      technical,
      profile,
      dataQuality: chartMeta.synthetic ? 'model' : 'live',
    }),
    [symbol, livePrice, prices, technical, profile, chartMeta.synthetic],
  );

  const handleCandleSelect = useCallback((payload) => {
    setSelectedCandle(payload);
  }, []);

  const handleTimeframe = (tf) => {
    setChartConfig(tf);
    setSelectedCandle(null);
  };

  return (
    <div className="bt-fundamentals">
      <header className="bt-fundamentals__header">
        <div>
          <h1 className="bt-fundamentals__title">Backtest Fundamentals</h1>
          <p className="bt-fundamentals__subtitle">
            See what happened inside each candle and why price moved.
          </p>
        </div>
        <MrktAssetDropdown
          symbol={symbol}
          assets={assetsList}
          prices={prices}
          onSelect={(sym) => {
            setSymbol(sym);
            setSelectedCandle(null);
          }}
        />
      </header>

      <div className="bt-fundamentals__workspace">
        <div className="bt-fundamentals__chart-col">
          <div className="bt-fundamentals__toolbar">
            <div className="bt-fundamentals__tf-group" role="group" aria-label="Chart timeframe">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.interval}
                  type="button"
                  className={`bt-fundamentals__tf-btn ${chartConfig.interval === tf.interval ? 'is-active' : ''}`}
                  onClick={() => handleTimeframe(tf)}
                >
                  {tf.label}
                </button>
              ))}
            </div>
            <div className="bt-fundamentals__dates">
              <input
                type="date"
                value={dates.start}
                max={dates.end}
                onChange={(e) => {
                  setDates((d) => ({ ...d, start: e.target.value }));
                  setSelectedCandle(null);
                }}
                className="bt-fundamentals__date-input"
                aria-label="Start date"
              />
              <span className="bt-fundamentals__date-sep">–</span>
              <input
                type="date"
                value={dates.end}
                min={dates.start}
                onChange={(e) => {
                  setDates((d) => ({ ...d, end: e.target.value }));
                  setSelectedCandle(null);
                }}
                className="bt-fundamentals__date-input"
                aria-label="End date"
              />
              <span className="bt-fundamentals__date-label">{formatDateRangeLabel(dates.start, dates.end)}</span>
            </div>
          </div>

          <div className="bt-fundamentals__chart-stage">
            <TradeChart
              key={`${symbol}-${chartConfig.interval}-${period}`}
              symbol={symbol}
              interval={chartConfig.interval}
              fill
              interactive
              quotePrice={livePrice}
            />
            <BacktestFundamentalsChart
              bars={chartBars}
              interval={chartConfig.interval}
              symbol={symbol}
              newsPool={headlineNews}
              isLiveTape={isLiveTape && !chartMeta.synthetic}
              onCandleSelect={handleCandleSelect}
            />
            {chartMeta.synthetic && chartBars.length >= 2 && (
              <div className="bt-fundamentals__data-badge" role="status">
                History: {chartMeta.source} — select a candle for fundamentals read
              </div>
            )}
          </div>
          <p className="bt-fundamentals__hint">
            {formatTfLabel(chartConfig.interval)} · {chartBars.length} bars in range · click any candle
          </p>
        </div>

        <div className="bt-fundamentals__panel-col">
          <BacktestFundamentalsPanel
            symbol={symbol}
            headline={selectedCandle}
            marketContext={marketContext}
            relatedNewsPool={headlineNews}
            prices={prices}
            canAiInsight={access.canNewsAi}
            onSelectAsset={setSymbol}
          />
        </div>
      </div>
    </div>
  );
};

export default BacktestFundamentals;
