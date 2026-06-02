import React from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { formatRelativeSync } from '../../utils/displayFormat.js';

/** Visible realtime status for the home terminal */
const MrktTerminalStatusBar = ({
  socketLive,
  lastPriceSync,
  lastNewsSync,
  lastChartSync,
  lastDeskSync,
  priceSource,
  chartLive,
  quoteDriftPct = null,
  decisionUnsafe = false,
  newsError,
  onRefresh,
  refreshing = false,
  compact = false,
}) => (
  <div
    className={`mrkt-terminal-status ${compact ? 'mrkt-terminal-status--compact' : ''}`}
    role="status"
    aria-live="polite"
  >
    <span className={`mrkt-terminal-status__pill ${socketLive ? 'mrkt-terminal-status__pill--live' : ''}`}>
      {socketLive ? <Wifi size={11} aria-hidden /> : <WifiOff size={11} aria-hidden />}
      {socketLive ? 'WebSocket live' : 'REST fallback'}
    </span>
    <span className="mrkt-terminal-status__item">
      Tape <strong>{formatRelativeSync(lastPriceSync)}</strong>
      {priceSource === 'socket' && socketLive ? ' · push' : ' · poll'}
    </span>
    <span className="mrkt-terminal-status__item">
      News <strong>{formatRelativeSync(lastNewsSync)}</strong>
      {newsError && <em className="mrkt-terminal-status__warn">{newsError}</em>}
    </span>
    <span className="mrkt-terminal-status__item">
      Chart OHLC <strong>{formatRelativeSync(lastChartSync)}</strong>
      {!chartLive && <em className="mrkt-terminal-status__warn">model bars</em>}
    </span>
    <span className="mrkt-terminal-status__item">
      Sync{' '}
      <strong className={decisionUnsafe ? 'mrkt-terminal-status__sync-bad' : 'mrkt-terminal-status__sync-ok'}>
        {quoteDriftPct == null ? 'checking' : `${quoteDriftPct.toFixed(2)}%`}
      </strong>
      {decisionUnsafe && <em className="mrkt-terminal-status__warn">feed divergence</em>}
    </span>
    <span className="mrkt-terminal-status__item">
      Desk <strong>{formatRelativeSync(lastDeskSync)}</strong>
    </span>
    <button
      type="button"
      className="mrkt-terminal-status__refresh"
      onClick={onRefresh}
      disabled={refreshing}
      title="Refresh all live feeds"
    >
      <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} aria-hidden />
      Sync all
    </button>
  </div>
);

export default MrktTerminalStatusBar;
