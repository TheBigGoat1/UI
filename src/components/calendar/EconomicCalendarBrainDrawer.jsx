import React from 'react';
import { X, Brain } from 'lucide-react';
import { impactLabel, COUNTRY_FLAGS } from '../../utils/deskBiasContent.js';
import BrainCalendarInsight from '../brain/BrainCalendarInsight.jsx';
import BrainClaudeBadge from '../brain/BrainClaudeBadge.jsx';
import { useCalendarEventAnalysis } from '../../hooks/useCalendarEventAnalysis.js';
import { useClaudeStatus } from '../../hooks/useClaudeStatus.js';

function formatEventWhen(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function countdownLabel(iso) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const mins = Math.round((t - Date.now()) / 60000);
  if (mins < -60) return `${Math.abs(Math.round(mins / 60))}h ago`;
  if (mins < 0) return `${Math.abs(mins)}m ago`;
  if (mins < 60) return `in ${mins}m`;
  const h = Math.round(mins / 60);
  return `in about ${h} hour${h === 1 ? '' : 's'}`;
}

const InsightCard = ({ event, symbol, prices, onRemove, onSelectAsset, claudeConfigured }) => {
  const title = event?.event_name || event?.event || 'Event';
  const country = String(event?.country || 'US').toUpperCase();
  const imp = impactLabel(event?.importance || event?.impact);
  const { loading, data, error } = useCalendarEventAnalysis(event, symbol, { enabled: true });
  const countdown = countdownLabel(event?.event_time);

  return (
    <article className="econ-cal-brain-card">
      <header className="econ-cal-brain-card__head">
        <div className="econ-cal-brain-card__title-row">
          <Brain size={14} className="econ-cal-brain-card__brain-icon" aria-hidden />
          <h3 className="econ-cal-brain-card__title">{title}</h3>
          <BrainClaudeBadge provider={data?.provider} aiEnabled={data?.aiEnabled} compact />
        </div>
        <button type="button" className="econ-cal-brain-card__close" onClick={onRemove} aria-label="Remove">
          <X size={14} />
        </button>
      </header>
      <div className="econ-cal-brain-card__meta">
        <span>{COUNTRY_FLAGS[country] || '🌐'}</span>
        <span>
          {country} · {formatEventWhen(event?.event_time)}
        </span>
        <span className={`econ-cal-brain-card__impact econ-cal-brain-card__impact--${imp.tone}`}>
          {imp.label}
        </span>
      </div>
      {countdown && (
        <span className="econ-cal-brain-card__countdown">
          <span className="econ-cal-brain-card__countdown-dot" aria-hidden />
          {countdown}
        </span>
      )}
      <div className="econ-cal-brain-card__body custom-scrollbar">
        <BrainCalendarInsight
          data={data}
          loading={loading}
          error={error}
          symbol={symbol}
          event={event}
          prices={prices}
          onSelectAsset={onSelectAsset}
          compact
          shell="none"
          claudeConfigured={claudeConfigured}
        />
      </div>
    </article>
  );
};

const EconomicCalendarBrainDrawer = ({
  events = [],
  symbol = 'XAUUSD',
  prices = {},
  onRemove,
  onClearAll,
  onClose,
  onSelectAsset,
}) => {
  const { claudeConfigured } = useClaudeStatus();

  if (!events.length) return null;

  return (
    <div className="econ-cal-brain-drawer" role="region" aria-label="Calendar event analysis">
      <div className="econ-cal-brain-drawer__tabs">
        <span className="econ-cal-brain-drawer__brand">
          <Brain size={14} aria-hidden />
          Insidr calendar analysis
        </span>
        {events.map((ev) => (
          <span key={ev.id || ev.event_name} className="econ-cal-brain-drawer__tab">
            {(ev.event_name || ev.event || 'Event').slice(0, 28)}
          </span>
        ))}
        <div className="econ-cal-brain-drawer__actions">
          <button type="button" className="econ-cal-brain-drawer__clear" onClick={onClearAll}>
            CLEAR ALL
          </button>
          <button type="button" className="econ-cal-brain-drawer__close" onClick={onClose} aria-label="Close drawer">
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="econ-cal-brain-drawer__row custom-scrollbar">
        {events.map((ev) => (
          <InsightCard
            key={ev.id || `${ev.event_name}-${ev.event_time}`}
            event={ev}
            symbol={symbol}
            prices={prices}
            onRemove={() => onRemove(ev)}
            onSelectAsset={onSelectAsset}
            claudeConfigured={claudeConfigured}
          />
        ))}
      </div>
    </div>
  );
};

export default EconomicCalendarBrainDrawer;
