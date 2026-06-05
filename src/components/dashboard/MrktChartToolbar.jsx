import React from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { formatRelativeSync } from '../../utils/displayFormat.js';
import MrktAssetDropdown from './MrktAssetDropdown.jsx';
import {
  Tag,
  Calendar,
  Target,
  Newspaper,
  Lock,
  Maximize2,
  Minimize2,
} from 'lucide-react';

const TIMEFRAMES = [
  { label: '1h', interval: '1h', period: '1W' },
  { label: '30m', interval: '30m', period: '1W' },
  { label: '15m', interval: '15m', period: '1D' },
  { label: '5m', interval: '5m', period: '1D' },
];

function ToggleBtn({ on, onClick, locked, children }) {
  return (
    <button
      type="button"
      className={`mrkt-toggle-btn ${on ? 'mrkt-toggle-btn--on' : ''} ${locked ? 'mrkt-toggle-btn--locked' : ''}`}
      onClick={onClick}
      title={locked ? 'Upgrade to unlock' : undefined}
    >
      {locked && <Lock size={10} className="opacity-70" />}
      {children}
    </button>
  );
}

const MrktChartToolbar = ({
  symbol,
  interval,
  onTimeframeChange,
  assets = [],
  prices = {},
  onSymbolChange,
  toggles,
  onToggle,
  newsOpen,
  onNewsToggle,
  access,
  onUpgrade,
  layout,
  status,
}) => {
  const activeTf =
    TIMEFRAMES.find((t) => t.interval === interval)?.label ||
    interval?.replace('1day', '1D') ||
    '1h';

  const tryToggle = (key, allowed) => {
    if (!allowed) {
      onUpgrade?.(key);
      return;
    }
    onToggle(key);
  };

  return (
    <div className="mrkt-chart-toolbar-wrap">
    <div className="mrkt-chart-toolbar">
      <div className="mrkt-chart-toolbar__left">
        <MrktAssetDropdown
          symbol={symbol}
          assets={assets}
          prices={prices}
          onSelect={onSymbolChange}
        />

        <div className="mrkt-chart-toolbar__tf-group">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.label}
              type="button"
              className={`mrkt-tf-pill ${activeTf === tf.label ? 'mrkt-tf-pill--active' : ''}`}
              onClick={() => onTimeframeChange(tf.interval, tf.period)}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mrkt-chart-toolbar__toggles">
        <ToggleBtn
          on={toggles.labels}
          locked={!access?.canLabels}
          onClick={() => tryToggle('labels', access?.canLabels)}
        >
          <Tag size={12} /> Labels
        </ToggleBtn>
        <ToggleBtn
          on={toggles.calendar}
          locked={!access?.canCalendar}
          onClick={() => tryToggle('calendar', access?.canCalendar)}
        >
          <Calendar size={12} /> Calendar Events
        </ToggleBtn>
        <ToggleBtn
          on={toggles.targets}
          locked={!access?.canTargets}
          onClick={() => tryToggle('targets', access?.canTargets)}
        >
          <Target size={12} /> Targets
        </ToggleBtn>
        <ToggleBtn on={newsOpen} locked={false} onClick={onNewsToggle}>
          <Newspaper size={12} /> News Feed
        </ToggleBtn>

        {layout?.onToggleChart && (
          <button
            type="button"
            className="mrkt-chart-toolbar__fullscreen"
            onClick={layout.onToggleChart}
            title={layout.chartExpanded ? 'Restore split view' : 'Expand chart'}
            aria-label={layout.chartExpanded ? 'Restore split view' : 'Expand chart'}
          >
            {layout.chartExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        )}
      </div>
    </div>
    {status && (
      <div className="mrkt-chart-toolbar-status" role="status" aria-live="polite">
        <span className={`mrkt-chart-toolbar-status__live ${status.socketLive ? 'is-live' : ''}`}>
          {status.socketLive ? <Wifi size={10} /> : <WifiOff size={10} />}
          {status.socketLive ? 'Live' : 'REST'}
        </span>
        <span>Tape <strong>{formatRelativeSync(status.lastPriceSync)}</strong></span>
        <span>News <strong>{formatRelativeSync(status.lastNewsSync)}</strong></span>
        {!status.chartLive && <span className="mrkt-chart-toolbar-status__warn">model bars</span>}
        {status.quoteDriftPct != null && (
          <span>
            Sync <strong>{status.quoteDriftPct.toFixed(2)}%</strong>
          </span>
        )}
        <button
          type="button"
          className="mrkt-chart-toolbar-status__sync"
          onClick={status.onRefresh}
          disabled={status.refreshing}
          title="Sync all feeds"
        >
          <RefreshCw size={11} className={status.refreshing ? 'animate-spin' : ''} />
        </button>
      </div>
    )}
    </div>
  );
};

export { TIMEFRAMES };
export default MrktChartToolbar;
