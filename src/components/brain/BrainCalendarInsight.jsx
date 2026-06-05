import React from 'react';
import { Loader2 } from 'lucide-react';
import { isClaudeProvider, providerLabel } from '../../utils/brainAnalysis.js';
import BrainAnalysisSections from './BrainAnalysisSections.jsx';
import BrainClaudeBadge from './BrainClaudeBadge.jsx';
import BrainProviderFoot from './BrainProviderFoot.jsx';

/**
 * Full calendar event desk read — Claude sections, live tape, assets to watch.
 */
const BrainCalendarInsight = ({
  data,
  loading = false,
  error = '',
  symbol,
  event,
  prices = {},
  onSelectAsset,
  compact = false,
  claudeConfigured = null,
  shell = 'full',
}) => {
  if (loading) {
    return (
      <div className={`brain-calendar-insight brain-calendar-insight--loading ${compact ? 'brain-calendar-insight--compact' : ''}`}>
        <Loader2 size={16} className="animate-spin" aria-hidden />
        <span>{claudeConfigured !== false ? 'Claude is building your desk read…' : 'Building desk read from calendar & live tape…'}</span>
      </div>
    );
  }

  if (error) {
    return <p className="brain-calendar-insight__error">{error}</p>;
  }

  if (!data) return null;

  const sections = data.sections || {};
  const provider = data.provider || '';
  const assets = data.assetsToWatch || [];
  const tape = data.liveTape?.length ? data.liveTape : null;

  const formatPct = (n) => {
    if (n == null || Number.isNaN(Number(n))) return '—';
    const v = Number(n);
    return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
  };

  return (
    <div className={`brain-calendar-insight ${compact ? 'brain-calendar-insight--compact' : ''}`}>
      {shell !== 'none' && (
        <div className="brain-calendar-insight__head">
          <BrainClaudeBadge provider={provider} aiEnabled={data.aiEnabled} compact={compact} />
          {!isClaudeProvider(provider, data.aiEnabled) && provider && (
            <span className="brain-calendar-insight__grounded">{providerLabel(provider, data.aiEnabled)}</span>
          )}
        </div>
      )}

      {(event?.forecast != null || event?.previous != null || event?.actual != null) && (
        <div className="brain-calendar-insight__figures">
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
          {symbol && <span className="brain-calendar-insight__sym">{symbol}</span>}
        </div>
      )}

      {tape && tape.length > 0 && (
        <div className="brain-calendar-insight__tape">
          <span className="brain-calendar-insight__tape-label">Live tape</span>
          <div className="brain-calendar-insight__tape-chips">
            {tape.map((q) => {
              const live = prices[q.symbol];
              const ch = live?.changePercent ?? live?.change_pct ?? q.changePercent;
              return (
                <button
                  key={q.symbol}
                  type="button"
                  className="brain-calendar-insight__chip"
                  onClick={() => onSelectAsset?.(q.symbol)}
                >
                  {q.symbol}{' '}
                  <span className={ch > 0 ? 'up' : ch < 0 ? 'down' : ''}>{formatPct(ch)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <BrainAnalysisSections
        sections={sections}
        fallbackAnalysis={data.analysis}
        compact={compact}
      />

      {assets.length > 0 && (
        <div className="brain-calendar-insight__assets">
          <span className="brain-calendar-insight__tape-label">Assets to watch</span>
          <ul className="brain-calendar-insight__asset-list">
            {assets.slice(0, 5).map((a) => (
              <li key={a.symbol}>
                <button type="button" className="brain-calendar-insight__asset-btn" onClick={() => onSelectAsset?.(a.symbol)}>
                  <span className={`brain-calendar-insight__bias brain-calendar-insight__bias--${a.bias || 'neutral'}`}>
                    {a.bias === 'up' ? '↗' : a.bias === 'down' ? '↘' : '·'}
                  </span>
                  <span className="brain-calendar-insight__asset-sym">{a.symbol}</span>
                  <span className="brain-calendar-insight__asset-rat">{a.rationale}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <BrainProviderFoot
        provider={provider}
        aiEnabled={data.aiEnabled}
        model={data.model}
        aiError={data.aiError}
        claudeConfigured={claudeConfigured}
      />
    </div>
  );
};

export default BrainCalendarInsight;
