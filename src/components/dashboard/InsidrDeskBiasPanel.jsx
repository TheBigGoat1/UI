import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  Calendar,
  Globe,
  Landmark,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import DeskCalendarEventsTab from './DeskCalendarEventsTab.jsx';
import DeskGeneralMarketsTab from './DeskGeneralMarketsTab.jsx';
import DeskRatesTab from './DeskRatesTab.jsx';
import DeskPanelSkeleton from './DeskPanelSkeleton.jsx';
import { formatDeskUpdated } from '../../utils/deskBiasContent.js';
import { buildBiasDeskColumns } from '../../utils/deskBiasIntelligence.js';

const PANEL_TABS = [
  { id: 'bias', label: 'Bias', icon: TrendingUp },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'markets', label: 'Markets', icon: Globe },
  { id: 'rates', label: 'Rates', icon: Landmark },
];

const VISIBLE_DEFAULT = 5;

function biasPhrase(bias) {
  const b = (bias || 'neutral').toLowerCase();
  if (b === 'bullish') return { text: 'slightly bullish', className: 'insidr-desk-bias__pill--bull' };
  if (b === 'bearish') return { text: 'slightly bearish', className: 'insidr-desk-bias__pill--bear' };
  return { text: 'neutral', className: 'insidr-desk-bias__pill--neutral' };
}

function resolveDisplayBias({ technicalBias, supportDir, aiFallback }) {
  const tech = String(technicalBias || 'neutral').toLowerCase();
  if (tech === 'bullish' || tech === 'bearish') return tech;
  const support = String(supportDir || '').toLowerCase();
  if (support === 'bullish' || support === 'bearish') return support;
  const ai = String(aiFallback?.bias || '').toLowerCase();
  if (ai === 'bullish' || ai === 'bearish') return ai;
  return 'neutral';
}

function flipWord(dir) {
  if (dir === 'bullish') return 'bullish';
  if (dir === 'bearish') return 'bearish';
  return 'the other way';
}

function BiasTapeStrip({ tape }) {
  if (!tape?.length) return null;
  return (
    <div className="insidr-desk-bias__tape" role="list" aria-label="Live tape context">
      {tape.map((m) => (
        <div
          key={m.label}
          className={`insidr-desk-bias__tape-cell insidr-desk-bias__tape-cell--${m.tone}`}
          role="listitem"
        >
          <span className="insidr-desk-bias__tape-label">{m.label}</span>
          <span className="insidr-desk-bias__tape-value">{m.value}</span>
        </div>
      ))}
    </div>
  );
}

function BiasFactorCard({ card, variant, onNewsClick }) {
  const snippets = card.newsItems?.length
    ? card.newsItems
    : card.news
      ? [card.news]
      : [];

  return (
    <article className={`insidr-desk-bias__card insidr-desk-bias__card--${variant}`}>
      <h5 className="insidr-desk-bias__card-title">
        <span className={`insidr-desk-bias__card-dot insidr-desk-bias__card-dot--${variant}`} />
        {card.title}
      </h5>
      <p className="insidr-desk-bias__card-body">{card.body}</p>
      {card.evidence?.length > 0 && (
        <div className="insidr-desk-bias__evidence" role="list" aria-label="Data backing this factor">
          {card.evidence.map((chip) => (
            <span key={`${chip.label}-${chip.value}`} className="insidr-desk-bias__evidence-chip" role="listitem">
              <span className="insidr-desk-bias__evidence-label">{chip.label}</span>
              <span className="insidr-desk-bias__evidence-value">{chip.value}</span>
            </span>
          ))}
        </div>
      )}
      {snippets.length > 0 && (
        <div className="insidr-desk-bias__news-list">
          {snippets.map((n) => (
            <button
              key={n.id || n.title}
              type="button"
              className={`insidr-desk-bias__news-snippet ${n.highlight ? 'insidr-desk-bias__news-snippet--hot' : ''}`}
              onClick={() => onNewsClick?.(n)}
              title={n.title}
            >
              <p className="insidr-desk-bias__news-headline">{n.title}</p>
              <span className="insidr-desk-bias__news-ago">{n.ago}</span>
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

function BiasColumn({ title, wordPill, wordClass, cards, variant, expanded, onToggleMore, onNewsClick }) {
  const visible = expanded ? cards : cards.slice(0, VISIBLE_DEFAULT);
  const extra = cards.length - VISIBLE_DEFAULT;

  return (
    <div className={`insidr-desk-bias__col insidr-desk-bias__col--${variant}`}>
      <h4>{title}</h4>
      <div className="insidr-desk-bias__card-stack">
        {cards.length === 0 ? (
          <p className="insidr-desk-bias__col-empty">Factors will appear as headlines sync for this symbol.</p>
        ) : (
          visible.map((card) => (
            <BiasFactorCard
              key={`${card.title}-${variant}`}
              card={card}
              variant={variant}
              onNewsClick={onNewsClick}
            />
          ))
        )}
      </div>
      {extra > 0 && (
        <button type="button" className="insidr-desk-bias__more" onClick={onToggleMore}>
          {expanded ? 'Show less' : `Show ${extra} more`}
          <ChevronDown size={12} className={expanded ? 'rotate-180' : ''} />
        </button>
      )}
    </div>
  );
}

const InsidrDeskBiasPanel = ({
  symbol,
  selectedNews,
  analysisState,
  prices = {},
  brief,
  newsPool = [],
  changePercent,
  deskData,
  deskLoading,
  onDeskRefresh,
  activeTab: controlledTab,
  onTabChange,
  onCalendarEventInsight,
  onSelectAsset,
  onNewsSelect,
  chartInterval = '1h',
  chartPeriod = '1W',
}) => {
  const [internalTab, setInternalTab] = useState('bias');
  const tab = controlledTab ?? internalTab;
  const setTab = onTabChange ?? setInternalTab;

  const [showMoreSupport, setShowMoreSupport] = useState(false);
  const [showMoreFlip, setShowMoreFlip] = useState(false);

  const { technical, loading, refresh, meta } = analysisState || {};
  const bias = technical?.bias || 'neutral';
  const updatedLabel = formatDeskUpdated(meta?.asOf);

  const liveBrief = brief || deskData?.brief;

  const deskView = useMemo(
    () =>
      buildBiasDeskColumns({
        symbol,
        bias,
        technical,
        brief: liveBrief,
        prices,
        deskData,
        selectedNews,
        newsPool,
        changePercent,
        chartInterval,
        chartPeriod,
      }),
    [symbol, bias, technical, liveBrief, prices, deskData, selectedNews, newsPool, changePercent, chartInterval, chartPeriod],
  );

  const { supportCards, flipCards, tape, summary, flipDir, headlineCount, timeframeSummary } = deskView;
  const supportVariant = deskView.supportDir === 'bearish' ? 'bear' : 'bull';
  const flipVariant = flipDir === 'bearish' ? 'bear' : 'bull';
  const displayBias = resolveDisplayBias({
    technicalBias: bias,
    supportDir: deskView.supportDir,
    aiFallback: deskData?.aiFallbackBias,
  });
  const phrase = biasPhrase(displayBias);

  const handleNewsSnippet = (snippet) => {
    const match = (newsPool || []).find(
      (n) => (n.title || '').toUpperCase() === snippet.title || n.title === snippet.title,
    );
    if (match) onNewsSelect?.(match, symbol);
  };

  if (!symbol) return null;

  return (
    <section className="insidr-desk-bias" aria-label="Desk bias and context">
      <div className="insidr-desk-bias__tabs" role="tablist">
        {PANEL_TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`insidr-desk-bias__tab ${tab === t.id ? 'insidr-desk-bias__tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <Icon size={12} aria-hidden />
              {t.label}
            </button>
          );
        })}
        <button
          type="button"
          className="insidr-desk-bias__refresh"
          onClick={() => {
            refresh?.();
            onDeskRefresh?.();
          }}
          title="Refresh desk data"
          aria-label="Refresh"
        >
          <RefreshCw size={13} className={loading || deskLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="insidr-desk-bias__scroll custom-scrollbar">
        {tab === 'bias' && (
          <div className="insidr-desk-bias__body" role="tabpanel">
            {loading && !summary && supportCards.length === 0 && flipCards.length === 0 ? (
              <DeskPanelSkeleton rows={4} />
            ) : (
              <>
            <h3 className="insidr-desk-bias__headline">
              The day trading bias on <strong>{symbol}</strong> is{' '}
              <span className={`insidr-desk-bias__pill ${phrase.className}`}>{phrase.text}</span>
            </h3>
            <p className="insidr-desk-bias__updated">
              Updated {updatedLabel}
              {headlineCount > 0 && (
                <span className="insidr-desk-bias__wire-count">
                  {' '}
                  · {headlineCount} headlines in context
                </span>
              )}
            </p>

            <BiasTapeStrip tape={tape} />

            {timeframeSummary && (
              <p className="insidr-desk-bias__tf-context">{timeframeSummary}</p>
            )}

            {summary && <p className="insidr-desk-bias__summary">{summary}</p>}
            {displayBias === 'neutral' && deskData?.aiFallbackBias?.rationale && (
              <p className="insidr-desk-bias__summary">{deskData.aiFallbackBias.rationale}</p>
            )}

            <div className="insidr-desk-bias__columns">
              <BiasColumn
                title={
                  <>
                    What supports the{' '}
                    <span
                      className={`insidr-desk-bias__word-pill insidr-desk-bias__word-pill--${supportVariant === 'bear' ? 'bear' : 'bull'}`}
                    >
                      bias
                    </span>
                    ?
                  </>
                }
                cards={supportCards}
                variant={supportVariant}
                expanded={showMoreSupport}
                onToggleMore={() => setShowMoreSupport((v) => !v)}
                onNewsClick={handleNewsSnippet}
              />
              <BiasColumn
                title={
                  <>
                    What could flip it{' '}
                    <span
                      className={`insidr-desk-bias__word-pill insidr-desk-bias__word-pill--${flipVariant === 'bear' ? 'bear' : 'bull'}`}
                    >
                      {flipWord(flipDir)}
                    </span>
                    ?
                  </>
                }
                cards={flipCards}
                variant={flipVariant}
                expanded={showMoreFlip}
                onToggleMore={() => setShowMoreFlip((v) => !v)}
                onNewsClick={handleNewsSnippet}
              />
            </div>
              </>
            )}
          </div>
        )}

        {tab === 'calendar' && (
          <DeskCalendarEventsTab
            symbol={symbol}
            prices={prices}
            onSelectAsset={onSelectAsset}
            onEventInsight={onCalendarEventInsight}
          />
        )}

        {tab === 'markets' && (
          <DeskGeneralMarketsTab
            deskData={deskData}
            loading={deskLoading}
            onRefresh={onDeskRefresh}
            prices={prices}
            brief={liveBrief}
            onSelectAsset={onSelectAsset}
          />
        )}

        {tab === 'rates' && (
          <DeskRatesTab
            deskData={deskData}
            loading={deskLoading}
            onRefresh={onDeskRefresh}
            symbol={symbol}
            prices={prices}
            onSelectAsset={onSelectAsset}
          />
        )}
      </div>
    </section>
  );
};

export default InsidrDeskBiasPanel;
