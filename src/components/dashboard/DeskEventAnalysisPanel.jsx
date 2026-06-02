import React, { useEffect, useState } from 'react';
import { X, Brain, TrendingUp, TrendingDown, Minus, Loader2, Sparkles } from 'lucide-react';
import { api } from '../../services/api/api.js';
import { impactLabel } from '../../utils/deskBiasContent.js';
import { getPriceRow } from '../../utils/newsAssets.js';

function impactBadgeClass(impact) {
  const imp = impactLabel(impact);
  if (imp.tone === 'high') return 'desk-event-inline__impact--high';
  if (imp.tone === 'med') return 'desk-event-inline__impact--medium';
  return 'desk-event-inline__impact--low';
}

function biasIcon(bias) {
  if (bias === 'up') return <TrendingUp size={11} aria-hidden />;
  if (bias === 'down') return <TrendingDown size={11} aria-hidden />;
  return <Minus size={11} aria-hidden />;
}

function formatPct(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  const v = Number(n);
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

const SECTION_LABELS = [
  { key: 'summary', title: 'Summary' },
  { key: 'transmission', title: 'Transmission' },
  { key: 'upsideSurprise', title: 'Upside surprise' },
  { key: 'downsideSurprise', title: 'Downside surprise' },
  { key: 'deskRead', title: 'Desk read' },
  { key: 'tradingNotes', title: 'Trading notes' },
];

/**
 * Inline Insidr event analysis — renders directly below the clicked calendar row.
 */
const DeskEventAnalysisPanel = ({ event, symbol, prices = {}, onClose, onSelectAsset, compact = false }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [claudeReady, setClaudeReady] = useState(null);

  useEffect(() => {
    let active = true;
    api.desk
      .getAiStatus()
      .then((res) => {
        if (active) setClaudeReady(Boolean(res?.data?.anthropicConfigured));
      })
      .catch(() => {
        if (active) setClaudeReady(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const title = event?.event_name || event?.event || event?.title || 'Macro release';
  const impact = event?.importance || event?.impact;

  useEffect(() => {
    if (!event) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    setData(null);

    api.desk
      .analyzeCalendarEvent(event, symbol)
      .then((res) => {
        if (!active) return;
        const payload = res?.data || {};
        if (!payload.analysis && !payload.sections) {
          setError('No analysis returned for this release.');
          return;
        }
        setData(payload);
      })
      .catch((e) => {
        if (active) setError(e?.error || 'Could not load desk analysis.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [event, symbol]);

  if (!event) return null;

  const sections = data?.sections || {};
  const assets = data?.assetsToWatch || [];
  const tape = data?.liveTape?.length ? data.liveTape : null;
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
          {isAi && (
            <span className="desk-event-inline__ai-badge">
              <Sparkles size={10} aria-hidden />
              Claude
            </span>
          )}
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
            {claudeReady === true || isAi
              ? 'Claude is building your desk read…'
              : 'Building desk read from calendar & live tape…'}
          </span>
        </div>
      ) : error ? (
        <p className="desk-event-inline__error">{error}</p>
      ) : (
        <div className="desk-event-inline__body">
          {tape && tape.length > 0 && (
            <div className="desk-event-inline__tape">
              <span className="desk-event-inline__tape-label">Live tape</span>
              <div className="desk-event-inline__tape-chips">
                {tape.map((q) => {
                  const live = getPriceRow(prices, q.symbol);
                  const ch = live?.changePercent ?? live?.change_pct ?? q.changePercent;
                  return (
                    <button
                      key={q.symbol}
                      type="button"
                      className="desk-event-inline__chip"
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

          <div className="desk-event-inline__sections">
            {SECTION_LABELS.map(({ key, title: sectionTitle }) => {
              const body = sections[key];
              if (!body) return null;
              return (
                <div key={key} className="desk-event-inline__section">
                  <h4 className="desk-event-inline__section-title">{sectionTitle}</h4>
                  <p className="desk-event-inline__section-body">{body}</p>
                </div>
              );
            })}
            {!sections.summary && data?.analysis && (
              <div className="desk-event-inline__section">
                <h4 className="desk-event-inline__section-title">Desk read</h4>
                <p className="desk-event-inline__section-body">{data.analysis}</p>
              </div>
            )}
          </div>

          {assets.length > 0 && (
            <div className="desk-event-inline__assets">
              <span className="desk-event-inline__tape-label">Assets to watch</span>
              <ul className="desk-event-inline__asset-list">
                {assets.map((a) => {
                  const row = getPriceRow(prices, a.symbol);
                  const ch = row?.changePercent ?? row?.change_pct;
                  return (
                    <li key={a.symbol}>
                      <button type="button" className="desk-event-inline__asset-btn" onClick={() => onSelectAsset?.(a.symbol)}>
                        <span className={`desk-event-inline__bias desk-event-inline__bias--${a.bias || 'neutral'}`}>
                          {biasIcon(a.bias)}
                        </span>
                        <span className="desk-event-inline__asset-sym">{a.symbol}</span>
                        <span className="desk-event-inline__asset-rat">{a.rationale}</span>
                        {ch != null && <span className={ch > 0 ? 'up' : ch < 0 ? 'down' : ''}>{formatPct(ch)}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <p className="desk-event-inline__foot">
            {isAi ? (
              <>
                Powered by Claude
                {data?.model ? ` · ${data.model}` : ''}
                {' · '}
                live desk tape
              </>
            ) : data?.aiError ? (
              <>Claude unavailable ({data.aiError}) · showing live desk read</>
            ) : claudeReady === false ? (
              <>Live desk · add ANTHROPIC_API_KEY to project .env and restart API (npm run dev:all)</>
            ) : (
              'Live desk · calendar + tape'
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default DeskEventAnalysisPanel;
