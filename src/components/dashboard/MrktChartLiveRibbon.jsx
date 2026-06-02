import React from 'react';
import { formatTfLabel } from '../../utils/timeframeStack.js';

/** Compact chart context strip — timeframe + bias only (price lives in header). */
const MrktChartLiveRibbon = ({
  bias,
  isLive = true,
  interval,
  period,
}) => {
  const biasLabel = bias ? String(bias).toLowerCase() : 'neutral';
  const tfLabel = interval ? `${formatTfLabel(interval)}${period ? ` · ${period}` : ''}` : '';

  return (
    <div className="mrkt-chart-live-ribbon mrkt-chart-live-ribbon--compact" role="status" aria-live="polite">
      <span className={`mrkt-chart-live-ribbon__dot ${isLive ? 'on' : ''}`} aria-hidden />
      {tfLabel && <span className="mrkt-chart-live-ribbon__tf">{tfLabel}</span>}
      <span className={`mrkt-chart-live-ribbon__bias mrkt-chart-live-ribbon__bias--${biasLabel}`}>
        {biasLabel} bias
      </span>
      <span className="mrkt-chart-live-ribbon__tag">{isLive ? 'LIVE' : 'MODEL'}</span>
    </div>
  );
};

export default MrktChartLiveRibbon;
