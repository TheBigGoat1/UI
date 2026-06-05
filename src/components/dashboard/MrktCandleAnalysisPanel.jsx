import React, { useEffect, useMemo, useState } from 'react';
import { X, Brain, Camera } from 'lucide-react';
import { api } from '../../services/api/api.js';
import TradeChart from '../TradeChart.jsx';
import MrktInfinityLoader from './MrktInfinityLoader.jsx';
import InsidrNewsAnalysis from './InsidrNewsAnalysis.jsx';
import { formatNewsTime } from '../../utils/newsAssets.js';
import {
  cacheKeyForCandle,
  getCachedCandleAnalysis,
  setCachedCandleAnalysis,
} from '../../utils/chartSessionCache.js';
import { buildInstantCandlePreview } from '../../utils/instantCandlePreview.js';
import { marketContextKey } from '../../utils/marketContextKey.js';

import BrainClaudeBadge from '../brain/BrainClaudeBadge.jsx';
import BrainCalendarEventRow from '../brain/BrainCalendarEventRow.jsx';
import { useCalendarInsightToggle, calendarEventRowId } from '../../hooks/useCalendarInsightToggle.js';
import { formatPanelTimestamp } from '../../utils/displayFormat.js';

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
  className = '',
}) => {
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [insightArticle, setInsightArticle] = useState(null);
  const { activeId: activeEventId, toggle: toggleEventInsight } = useCalendarInsightToggle();

  const title = headline?.title || headline?.text || 'Session move';
  const publishedAt = headline?.publishedAt || headline?.time || headline?.published_at;

  const ctxKey = marketContextKey(marketContext);

  useEffect(() => {
    let active = true;
    const cacheKey = cacheKeyForCandle(symbol, publishedAt, title);
    const cached = getCachedCandleAnalysis(cacheKey);
    if (cached) {
      setData(cached);
      setLoading(false);
      setEnhancing(false);
      setError('');
      return () => {
        active = false;
      };
    }

    const instant = buildInstantCandlePreview({
      symbol,
      headline,
      marketContext,
      relatedNewsPool,
    });
    setData(instant);
    setLoading(false);
    setEnhancing(true);
    setError('');

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
        bar: headline?.bar || null,
      })
      .then((res) => {
        if (!active) return;
        if (!res?.success) {
          setError(res?.error || 'Candle analysis unavailable.');
          return;
        }
        setCachedCandleAnalysis(cacheKey, res.data);
        setData(res.data);
      })
      .catch((e) => {
        if (active) setError(e.error || 'Could not load candle analysis.');
      })
      .finally(() => {
        if (active) setEnhancing(false);
      });

    return () => {
      active = false;
    };
  }, [symbol, title, publishedAt, ctxKey, relatedNewsPool.length]);

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

  return (
    <aside
      className={`mrkt-candle-drawer ${className}`.trim()}
      role="complementary"
      aria-labelledby="mrkt-candle-drawer-title"
    >
      <header className="mrkt-candle-drawer__head">
        <div>
          <div className="mrkt-candle-drawer__title-row">
            <Brain size={16} className="mrkt-candle-drawer__brain" aria-hidden />
            <h2 id="mrkt-candle-drawer-title" className="mrkt-candle-drawer__title">
              Candle Analysis — {symbol}
            </h2>
            <BrainClaudeBadge provider={data?.provider} compact />
          </div>
          <p className="mrkt-candle-drawer__time">{formatPanelTimestamp(publishedAt)}</p>
        </div>
        <button type="button" className="mrkt-candle-drawer__close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
      </header>

      {loading ? (
        <div className="mrkt-candle-drawer__loading">
          <MrktInfinityLoader label="Opening candle analysis…" />
        </div>
      ) : error ? (
        <p className="mrkt-candle-drawer__error">{error}</p>
      ) : (
        <div className="mrkt-candle-drawer__scroll custom-scrollbar">
          {enhancing && (
            <p className="mrkt-candle-drawer__enhancing" role="status">
              Enhancing with live calendar &amp; Claude desk read…
            </p>
          )}
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

          {(data?.whatLedToThis?.summary || (data?.whatLedToThis?.bullets || []).length > 0) && (
            <section className="mrkt-candle-section mrkt-candle-section--led">
              <h3 className="mrkt-candle-section__title">What may have led to this</h3>
              {data?.whatLedToThis?.summary && (
                <p className="mrkt-candle-section__summary">{data.whatLedToThis.summary}</p>
              )}
              <ul className="mrkt-candle-bullets">
                {(data?.whatLedToThis?.bullets || []).map((b, i) => (
                  <li key={`led-${i}`}>{b}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="mrkt-candle-section">
            <h3 className="mrkt-candle-section__title">Technicals</h3>
            <p className="mrkt-candle-section__body">
              {data?.technicals || 'Structure read building from live chart context.'}
            </p>
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
                <li className="mrkt-candle-news-empty">
                  AI context generated from candle structure and macro tape while the wire catches up.
                </li>
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
              {relatedEvents.map((ev) => (
                <BrainCalendarEventRow
                  key={calendarEventRowId(ev) || ev.event_name}
                  event={ev}
                  symbol={symbol}
                  prices={prices}
                  canAiInsight={canAiInsight}
                  activeId={activeEventId}
                  onToggle={toggleEventInsight}
                  onSelectAsset={onSelectAsset}
                />
              ))}
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
