import React from 'react';
import { Brain } from 'lucide-react';
import { COUNTRY_FLAGS } from '../../utils/deskBiasContent.js';
import { formatMacroValue } from '../../utils/displayFormat.js';
import { useCalendarEventAnalysis } from '../../hooks/useCalendarEventAnalysis.js';
import { useClaudeStatus } from '../../hooks/useClaudeStatus.js';
import { calendarEventRowId } from '../../hooks/useCalendarInsightToggle.js';
import BrainCalendarInsight from './BrainCalendarInsight.jsx';

function defaultImpactClass(impact) {
  const imp = String(impact || '').toUpperCase();
  if (imp === 'HIGH') return 'mrkt-candle-event__impact--high';
  if (imp === 'MEDIUM' || imp === 'MED') return 'mrkt-candle-event__impact--medium';
  return 'mrkt-candle-event__impact--low';
}

function defaultImpactLabel(impact) {
  const imp = String(impact || '').toUpperCase();
  if (imp === 'HIGH') return 'HIGH';
  if (imp === 'MEDIUM' || imp === 'MED') return 'MEDIUM';
  return 'LOW';
}

/**
 * Economic event row with brain → full Claude calendar analysis (shared orchestration).
 */
const BrainCalendarEventRow = ({
  event,
  symbol,
  prices = {},
  canAiInsight = true,
  activeId,
  onToggle,
  onSelectAsset,
  impactBadgeClass = defaultImpactClass,
  impactBadgeLabel = defaultImpactLabel,
}) => {
  const rowId = calendarEventRowId(event);
  const isActive = activeId === rowId;
  const { claudeConfigured } = useClaudeStatus();
  const { loading, data, error } = useCalendarEventAnalysis(event, symbol, {
    enabled: Boolean(isActive && canAiInsight),
  });

  const country = String(event?.country || 'US').toUpperCase();
  const name = event?.event_name || event?.event || 'Event';
  const impact = event?.importance || event?.impact;

  return (
    <li className={`mrkt-candle-event-row ${isActive ? 'mrkt-candle-event-row--open' : ''}`}>
      <span className="mrkt-candle-event-row__flag" aria-hidden>
        {COUNTRY_FLAGS[country] || '🌐'}
      </span>
      <div className="mrkt-candle-event-row__body">
        <p className="mrkt-candle-event-row__name">{name}</p>
        <p className="mrkt-candle-event-row__vals">
          Actual: <strong>{formatMacroValue(event?.actual, 'actual')}</strong>
          {' | '}
          Forecast: <strong>{formatMacroValue(event?.forecast, 'forecast')}</strong>
        </p>
        {isActive && (
          <div className="mrkt-candle-event-row__insight">
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
        )}
      </div>
      <span className={`mrkt-candle-event__impact ${impactBadgeClass(impact)}`}>
        {impactBadgeLabel(impact)}
      </span>
      {canAiInsight && (
        <button
          type="button"
          className={`mrkt-candle-event-row__brain ${isActive ? 'mrkt-candle-event-row__brain--on' : ''}`}
          onClick={() => onToggle?.(event)}
          aria-label={isActive ? `Close analysis for ${name}` : `Claude desk read — ${name}`}
          aria-pressed={isActive}
        >
          <Brain size={16} />
        </button>
      )}
    </li>
  );
};

export default BrainCalendarEventRow;
