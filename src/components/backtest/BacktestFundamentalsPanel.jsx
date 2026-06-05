import React, { useEffect, useMemo, useState } from 'react';
import { Brain, Camera } from 'lucide-react';
import { api } from '../../services/api/api.js';
import TradeChart from '../TradeChart.jsx';
import InsidrNewsAnalysis from '../dashboard/InsidrNewsAnalysis.jsx';
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

/** Inline right panel — candle narrative, 1M drill-down, news */
const BacktestFundamentalsPanel = ({
  symbol,
  headline,
  marketContext,
  relatedNewsPool = [],
  prices = {},
  canAiInsight = true,
  onSelectAsset,
}) => {
  const [enhancing, setEnhancing] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [insightArticle, setInsightArticle] = useState(null);
  const { activeId: activeEventId, toggle: toggleEventInsight } = useCalendarInsightToggle();

  const title = headline?.title || headline?.text || 'Session move';
  const publishedAt = headline?.publishedAt || headline?.time || headline?.published_at;
  const windowLabel = headline?.windowLabel;

  const ctxKey = marketContextKey(marketContext);

  useEffect(() => {
    if (!symbol || !headline) return undefined;
    let active = true;
    const cacheKey = cacheKeyForCandle(symbol, publishedAt, title);
    const cached = getCachedCandleAnalysis(cacheKey);
    if (cached) {
      setData(cached);
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
  }, [symbol, title, publishedAt, ctxKey, relatedNewsPool.length, headline]);

  const relatedNews = useMemo(() => {
    const fromApi = data?.relatedNews;
    if (Array.isArray(fromApi) && fromApi.length) return fromApi;
    return relatedNewsPool
      .filter((n) => n.title && n.title !== title)
      .slice(0, 8)
      .map((n) => ({
        title: n.title,
        summary: n.description || n.summary,
        publishedAt: n.publishedAt || n.time,
        url: n.url || n.link,
      }));
  }, [data?.relatedNews, relatedNewsPool, title]);

  const relatedEvents = data?.relatedEvents || [];

  if (!headline) {
    return (
      <div className="bt-fundamentals-panel bt-fundamentals-panel--empty">
        <p>Click a candle on the chart to see what happened inside that bar and why price moved.</p>
      </div>
    );
  }

  return (
    <div className="bt-fundamentals-panel custom-scrollbar">
      <header className="bt-fundamentals-panel__head">
        <div className="bt-fundamentals-panel__title-row">
          <Brain size={15} aria-hidden />
          <span className="bt-fundamentals-panel__label">Candle narrative</span>
          <BrainClaudeBadge provider={data?.provider} compact />
        </div>
        <p className="bt-fundamentals-panel__window">{windowLabel || formatPanelTimestamp(publishedAt)}</p>
        {enhancing && (
          <p className="bt-fundamentals-panel__enhancing" role="status">
            Enhancing with live calendar &amp; desk read…
          </p>
        )}
      </header>

      {error ? (
        <p className="bt-fundamentals-panel__error">{error}</p>
      ) : (
        <>
          <section className="bt-fundamentals-panel__narrative">
            <p className="bt-fundamentals-panel__summary">
              {data?.whatHappened?.summary || headline?.description || title}
            </p>
            {(data?.whatHappened?.bullets || []).length > 0 && (
              <ul className="mrkt-candle-bullets">
                {(data?.whatHappened?.bullets || []).map((b, i) => (
                  <li key={`b-${i}`}>{b}</li>
                ))}
              </ul>
            )}
          </section>

          <div className="bt-fundamentals-panel__drill">
            <div className="bt-fundamentals-panel__drill-inner">
              <TradeChart
                key={`bt-drill-${symbol}-1m-${publishedAt}`}
                symbol={symbol}
                interval="1m"
                height={220}
                compact
                fill={false}
                quotePrice={prices[symbol]?.price}
              />
              <span className="bt-fundamentals-panel__drill-watermark" aria-hidden>
                1M
              </span>
              <div className="bt-fundamentals-panel__drill-markers" aria-hidden>
                <span className="bt-fundamentals-panel__drill-marker bt-fundamentals-panel__drill-marker--start">
                  Start
                </span>
                <span className="bt-fundamentals-panel__drill-marker bt-fundamentals-panel__drill-marker--end">
                  End
                </span>
              </div>
              {relatedEvents.length > 0 && (
                <div className="mrkt-candle-chart-events" aria-label="Events on chart window">
                  {relatedEvents.slice(0, 3).map((ev) => (
                    <span key={ev.id || ev.event_name} className="mrkt-candle-chart-event-pill">
                      {(ev.event_name || ev.event || 'Event').slice(0, 16)}
                      {(ev.event_name || '').length > 16 ? '…' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <section className="mrkt-candle-section mrkt-candle-section--news">
            <h3 className="mrkt-candle-section__title">Relevant News</h3>
            <p className="mrkt-candle-hot-label">HOT HEADLINES</p>
            <ul className="mrkt-candle-news-list">
              {relatedNews.length === 0 && (
                <li className="mrkt-candle-news-empty">
                  No matched headlines in this window — narrative built from candle structure and macro context.
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
                        {ago ? ` · ${ago}` : ''}
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

          {relatedEvents.length > 0 && (
            <section className="mrkt-candle-section">
              <h3 className="mrkt-candle-section__title">Relevant Economic Events</h3>
              <ul className="mrkt-candle-events-list">
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
          )}

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
        </>
      )}
    </div>
  );
};

export default BacktestFundamentalsPanel;
