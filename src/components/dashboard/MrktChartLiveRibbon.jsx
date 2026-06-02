import React from 'react';

function fmtPrice(n, symbol) {
  if (!Number.isFinite(n)) return '—';
  if (/JPY|XAU|XAG|US500|NAS|US30/i.test(symbol || '')) return n.toFixed(2);
  if (n >= 100) return n.toFixed(2);
  if (n >= 10) return n.toFixed(4);
  return n.toFixed(5);
}

/** Live tape strip over chart — updates with websocket / REST prices */
const MrktChartLiveRibbon = ({
  symbol,
  price,
  changePercent,
  bias,
  isLive = true,
  interval,
}) => {
  const ch = Number(changePercent);
  const hasCh = Number.isFinite(ch);
  const up = hasCh && ch > 0.02;
  const down = hasCh && ch < -0.02;
  const biasLabel = bias ? String(bias).toLowerCase() : 'neutral';

  return (
    <div className="mrkt-chart-live-ribbon" role="status" aria-live="polite">
      <span className={`mrkt-chart-live-ribbon__dot ${isLive ? 'on' : ''}`} aria-hidden />
      <span className="mrkt-chart-live-ribbon__sym">{symbol}</span>
      <span className="mrkt-chart-live-ribbon__px">{fmtPrice(Number(price), symbol)}</span>
      {hasCh && (
        <span className={`mrkt-chart-live-ribbon__ch ${up ? 'up' : down ? 'down' : ''}`}>
          {ch >= 0 ? '+' : ''}
          {ch.toFixed(2)}%
        </span>
      )}
      <span className={`mrkt-chart-live-ribbon__bias mrkt-chart-live-ribbon__bias--${biasLabel}`}>
        {biasLabel}
      </span>
      {interval && <span className="mrkt-chart-live-ribbon__tf">{interval}</span>}
      <span className="mrkt-chart-live-ribbon__tag">{isLive ? 'LIVE' : 'MODEL'}</span>
    </div>
  );
};

export default MrktChartLiveRibbon;
