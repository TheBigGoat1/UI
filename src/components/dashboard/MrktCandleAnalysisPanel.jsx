import React, { useEffect, useMemo, useState } from 'react';
import { X, Brain, Camera } from 'lucide-react';
import { api } from '../../services/api/api.js';
import TradeChart from '../TradeChart.jsx';
import MrktInfinityLoader from './MrktInfinityLoader.jsx';
import InsidrNewsAnalysis from './InsidrNewsAnalysis.jsx';
import { formatNewsTime } from '../../utils/newsAssets.js';
import { impactLabel, COUNTRY_FLAGS } from '../../utils/deskBiasContent.js';

function formatPanelTimestamp(publishedAt) {
  if (!publishedAt) return new Date().toLocaleString();
  const d = new Date(publishedAt);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

function impactBadgeClass(impact) {
  const imp = impactLabel(impact);
  if (imp.tone === 'high') return 'mrkt-candle-event__impact--high';
  if (imp.tone === 'med') return 'mrkt-candle-event__impact--medium';
  return 'mrkt-candle-event__impact--low';
}

function impactBadgeLabel(impact) {
  const imp = impactLabel(impact);
  if (imp.tone === 'high') return 'HIGH';
  if (imp.tone === 'med') return 'MEDIUM';
  return 'LOW';
}

/** Right-side Candle Analysis drawer — MRKT home parity */
const MrktCandleAnalysisPanel = ({
  symbol,
  headline,
  marketContext,
  relatedNewsPool = [],
  prices = {},
  canAiInsight = true,
  onClose,
  onSelectAsset,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [insightArticle, setInsightArticle] = useState(null);
  const [eventInsight, setEventInsight] = useState({ id: null, text: '' });

  const title = headline?.title || headline?.text || 'Session move';
  const publishedAt = headline?.publishedAt || headline?.time || headline?.published_at;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setData(null);

    api.desk
      .candleAnalysis({
        symbol,
        headline: {
          title,
          summary: headline?.description || headline?.summary,
          publishedAt,
          url: headline?.url || headline?.link,
          source: headline?.source,
        },
        marketContext,
        relatedNews: relatedNewsPool.map((n) => ({
          title: n.title,
          summary: n.description || n.summary,
          publishedAt: n.publishedAt || n.time,
          url: n.url || n.link,
        })),
      })
      .then((res) => {
        if (!active) return;
        if (!res?.success) {
          setError(res?.error || 'Candle analysis unavailable.');
          return;
        }
        setData(res.data);
      })
      .catch((e) => {
        if (active) setError(e.error || 'Could not load candle analysis.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [symbol, title, publishedAt, marketContext, relatedNewsPool.length]);

  const relatedNews = useMemo(() => {
    const fromApi = data?.relatedNews;
    if (Array.isArray(fromApi) && fromApi.length) return fromApi;
    return relatedNewsPool
      .filter((n) => n.title && n.title !== title)
      .slice(0, 6)
      .map((n) => ({
        title: n.title,
        summary: n.description || n.summary,
        publishedAt: n.publishedAt || n.time,
        url: n.url || n.link,
      }));
  }, [data?.relatedNews, relatedNewsPool, title]);

  const relatedEvents = data?.relatedEvents || [];

  const requestEventInsight = async (event) => {
    const id = event.id || `${event.event_name}-${event.event_time}`;
    setEventInsight({ id, text: 'Generating desk read…' });
    try {
      const res = await api.desk.analyzeCalendarEvent(event, symbol);
      setEventInsight({
        id,
        text: res?.data?.analysis || res?.data?.reply || 'No analysis returned.',
      });
    } catch (e) {
      setEventInsight({ id, text: e.error || 'Calendar analysis failed.' });
    }
  };

  return (
    <aside className="mrkt-candle-drawer" role="complementary" aria-labelledby="mrkt-candle-drawer-title">
      <header className="mrkt-candle-drawer__head">
        <div>
          <h2 id="mrkt-candle-drawer-title" className="mrkt-candle-drawer__title">
            Candle Analysis — {symbol}
          </h2>
          <p className="mrkt-candle-drawer__time">{formatPanelTimestamp(publishedAt)}</p>
        </div>
        <button type="button" className="mrkt-candle-drawer__close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
      </header>

      {loading ? (
        <div className="mrkt-candle-drawer__loading">
          <MrktInfinityLoader label="Building candle read from headline, calendar & chart…" />
        </div>
      ) : error ? (
        <p className="mrkt-candle-drawer__error">{error}</p>
      ) : (
        <div className="mrkt-candle-drawer__scroll custom-scrollbar">
          <section className="mrkt-candle-section">
            <h3 className="mrkt-candle-section__title">What happened?</h3>
            <p className="mrkt-candle-section__summary">
              {data?.whatHappened?.summary || headline?.description || title}
            </p>
            <ul className="mrkt-candle-bullets">
              {(data?.whatHappened?.bullets || []).map((b, i) => (
                <li key={`b-${i}`}>{b}</li>
              ))}
            </ul>
          </section>

          <section className="mrkt-candle-section">
            <h3 className="mrkt-candle-section__title">Technicals</h3>
            <p className="mrkt-candle-section__body">{data?.technicals || '—'}</p>
          </section>

          <div className="mrkt-candle-chart-wrap">
            <TradeChart
              key={`candle-drawer-${symbol}-1m`}
              symbol={symbol}
              interval="1m"
              height={260}
              compact
              fill={false}
              quotePrice={prices[symbol]?.price}
            />
            {relatedEvents.length > 0 && (
              <div className="mrkt-candle-chart-events" aria-label="Events on chart window">
                {relatedEvents.slice(0, 4).map((ev) => (
                  <span key={ev.id || ev.event_name} className="mrkt-candle-chart-event-pill">
                    {(ev.event_name || ev.event || 'Event').slice(0, 14)}
                    {(ev.event_name || '').length > 14 ? '…' : ''}
                  </span>
                ))}
              </div>
            )}
          </div>

          <section className="mrkt-candle-section mrkt-candle-section--news">
            <h3 className="mrkt-candle-section__title">Relevant News</h3>
            <p className="mrkt-candle-hot-label">HOT HEADLINES</p>
            <ul className="mrkt-candle-news-list">
              {relatedNews.length === 0 && (
                <li className="mrkt-candle-news-empty">No related headlines in the current feed.</li>
              )}
              {relatedNews.map((n, i) => {
                const { clock, ago } = formatNewsTime(n.publishedAt);
                const d = n.publishedAt ? new Date(n.publishedAt) : null;
                const dateLabel =
                  d && !Number.isNaN(d.getTime())
                    ? d.toLocaleString(undefined, {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : clock;
                return (
                  <li key={`${n.title}-${i}`} className="mrkt-candle-news-row">
                    <div className="mrkt-candle-news-row__main">
                      <p className="mrkt-candle-news-row__meta">
                        {dateLabel}
                        {ago ? ` • ${ago}` : ''}
                      </p>
                      <p className="mrkt-candle-news-row__headline">{(n.title || '').toUpperCase()}</p>
                    </div>
                    <div className="mrkt-candle-news-row__actions">
                      {canAiInsight && (
                        <button
                          type="button"
                          className="mrkt-candle-news-row__icon"
                          aria-label="Insidr Analysis"
                          onClick={() =>
                            setInsightArticle({
                              title: n.title,
                              description: n.summary,
                              publishedAt: n.publishedAt,
                              url: n.url,
                            })
                          }
                        >
                          <Brain size={16} />
                        </button>
                      )}
                      {n.url && (
                        <a
                          href={n.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mrkt-candle-news-row__icon"
                          aria-label="Open source"
                        >
                          <Camera size={16} />
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="mrkt-candle-section">
            <h3 className="mrkt-candle-section__title">Relevant Economic Events</h3>
            <ul className="mrkt-candle-events-list">
              {relatedEvents.length === 0 && (
                <li className="mrkt-candle-news-empty">No calendar events near this candle — sync macro data.</li>
              )}
              {relatedEvents.map((ev) => {
                const country = String(ev.country || 'US').toUpperCase();
                const name = ev.event_name || ev.event || 'Event';
                const rowId = ev.id || `${name}-${ev.event_time}`;
                const showInsight = eventInsight.id === rowId && eventInsight.text;
                const analyzing = eventInsight.id === rowId && eventInsight.text === 'Generating desk read…';
                return (
                  <li key={rowId} className="mrkt-candle-event-row">
                    <span className="mrkt-candle-event-row__flag" aria-hidden>
                      {COUNTRY_FLAGS[country] || '🌐'}
                    </span>
                    <div className="mrkt-candle-event-row__body">
                      <p className="mrkt-candle-event-row__name">{name}</p>
                      <p className="mrkt-candle-event-row__vals">
                        Actual: <strong>{ev.actual ?? '—'}</strong>
                        {' | '}
                        Forecast: <strong>{ev.forecast ?? '—'}</strong>
                      </p>
                      {showInsight && <p className="mrkt-candle-event-row__insight">{eventInsight.text}</p>}
                    </div>
                    <span
                      className={`mrkt-candle-event__impact ${impactBadgeClass(ev.importance || ev.impact)}`}
                    >
                      {impactBadgeLabel(ev.importance || ev.impact)}
                    </span>
                    {canAiInsight && (
                      <button
                        type="button"
                        className="mrkt-candle-event-row__brain"
                        disabled={analyzing}
                        onClick={() => requestEventInsight(ev)}
                        aria-label={`Analyze ${name}`}
                      >
                        <Brain size={16} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {insightArticle && (
            <div className="mrkt-candle-drawer__nested-insight">
              <InsidrNewsAnalysis
                article={insightArticle}
                asset={symbol}
                prices={prices}
                marketContext={marketContext}
                onSelectAsset={onSelectAsset}
                onClose={() => setInsightArticle(null)}
              />
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

export default MrktCandleAnalysisPanel;
