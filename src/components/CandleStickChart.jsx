import TradingViewChart from './TradingViewChart.jsx';

/** @deprecated Use TradeChart / TradingViewChart — kept for imports */
const CandleStickChart = ({ symbol, asset, interval = '4h', height = 160, className = '' }) => (
  <TradingViewChart
    symbol={symbol || asset}
    interval={interval}
    height={height}
    compact
    interactive={false}
    className={className}
  />
);

export default CandleStickChart;
