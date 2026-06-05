import React from 'react';
import { X, Brain, Loader2 } from 'lucide-react';
import { impactLabel } from '../../utils/deskBiasContent.js';
import BrainClaudeBadge from '../brain/BrainClaudeBadge.jsx';
import BrainCalendarInsight from '../brain/BrainCalendarInsight.jsx';
import { useCalendarEventAnalysis } from '../../hooks/useCalendarEventAnalysis.js';
import { useClaudeStatus } from '../../hooks/useClaudeStatus.js';

function impactBadgeClass(impact) {
  const imp = impactLabel(impact);
  if (imp.tone === 'high') return 'desk-event-inline__impact--high';
  if (imp.tone === 'med') return 'desk-event-inline__impact--medium';
  return 'desk-event-inline__impact--low';
}

/**
 * Inline Insidr calendar analysis — Claude macro brief below a release row.
 */
const DeskEventAnalysisPanel = ({ event, symbol, prices = {}, onClose, onSelectAsset, compact = false }) => {
  const { claudeConfigured } = useClaudeStatus();
  const { loading, data, error } = useCalendarEventAnalysis(event, symbol, {
    enabled: Boolean(event),
  });

  if (!event) return null;

  const title = event?.event_name || event?.event || event?.title || 'Macro release';
  const impact = event?.importance || event?.impact;
  const provider = data?.provider || '';
  const isAi = provider === 'anthropic' || data?.aiEnabled;

  return (
    <div
      className={`desk-event-inline ${compact ? 'desk-event-inline--compact' : ''}`}
      role="region"
      aria-label={`Insidr analysis for ${title}`}
    >
      <div className="desk-event-inline__head">
        <span className="desk-event-inline__brand">
          <Brain size={13} aria-hidden />
          Insidr analysis
          <BrainClaudeBadge provider={provider} aiEnabled={data?.aiEnabled} compact />
        </span>
        <button type="button" className="desk-event-inline__close" onClick={onClose} aria-label="Close analysis">
          <X size={14} />
        </button>
      </div>

      {(event.forecast != null || event.previous != null || event.actual != null) && (
        <div className="desk-event-inline__figures">
          {event.actual != null && (
            <span>
              Actual <strong>{event.actual}</strong>
            </span>
          )}
          {event.forecast != null && (
            <span>
              Fcst <strong>{event.forecast}</strong>
            </span>
          )}
          {event.previous != null && (
            <span>
              Prev <strong>{event.previous}</strong>
            </span>
          )}
          {impact && (
            <span className={`desk-event-inline__impact ${impactBadgeClass(impact)}`}>
              {String(impact).toUpperCase()}
            </span>
          )}
          <span className="desk-event-inline__sym">{symbol}</span>
        </div>
      )}

      {loading ? (
        <div className="desk-event-inline__loading">
          <Loader2 size={16} className="animate-spin" aria-hidden />
          <span>
            {claudeConfigured !== false || isAi
              ? 'Claude is building your desk read…'
              : 'Building desk read from calendar & live tape…'}
          </span>
        </div>
      ) : (
        <BrainCalendarInsight
          data={data}
          loading={false}
          error={error}
          symbol={symbol}
          event={event}
          prices={prices}
          onSelectAsset={onSelectAsset}
          compact={compact}
          shell="none"
          claudeConfigured={claudeConfigured}
        />
      )}
    </div>
  );
};

export default DeskEventAnalysisPanel;
