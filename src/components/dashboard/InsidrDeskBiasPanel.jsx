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
import {
  buildBullishBiasCards,
  buildBearishBiasCards,
  formatDeskUpdated,
  prioritizeBiasCards,
} from '../../utils/deskBiasContent.js';

const PANEL_TABS = [
  { id: 'bias', label: 'Bias', icon: TrendingUp },
  { id: 'calendar', label: 'Calendar Events', icon: Calendar },
  { id: 'markets', label: 'General Markets', icon: Globe },
  { id: 'rates', label: 'Rates & Central Bank', icon: Landmark },
];

function biasPhrase(bias) {
  const b = (bias || 'neutral').toLowerCase();
  if (b === 'bullish') return { text: 'slightly bullish', className: 'insidr-desk-bias__pill--bull' };
  if (b === 'bearish') return { text: 'slightly bearish', className: 'insidr-desk-bias__pill--bear' };
  return { text: 'neutral', className: 'insidr-desk-bias__pill--neutral' };
}

function BiasFactorCard({ card, variant }) {
  return (
    <article className={`insidr-desk-bias__card insidr-desk-bias__card--${variant}`}>
      <h5 className="insidr-desk-bias__card-title">
        <span className={`insidr-desk-bias__card-dot insidr-desk-bias__card-dot--${variant}`} />
        {card.title}
      </h5>
      <p className="insidr-desk-bias__card-body">{card.body}</p>
      {card.news && (
        <div className="insidr-desk-bias__news-snippet">
          <p className="insidr-desk-bias__news-headline">{card.news.title}</p>
          <span className="insidr-desk-bias__news-ago">{card.news.ago}</span>
        </div>
      )}
    </article>
  );
}

const InsidrDeskBiasPanel = ({
  symbol,
  selectedNews,
  analysisState,
  prices = {},
  brief,
  deskData,
  deskLoading,
  onDeskRefresh,
  activeTab: controlledTab,
  onTabChange,
  onCalendarEventInsight,
  onSelectAsset,
}) => {
  const [internalTab, setInternalTab] = useState('bias');
  const tab = controlledTab ?? internalTab;
  const setTab = onTabChange ?? setInternalTab;

  const [showMoreBear, setShowMoreBear] = useState(false);

  const { technical, loading, refresh, meta } = analysisState || {};
  const bias = technical?.bias || 'neutral';
  const phrase = biasPhrase(bias);
  const updatedLabel = formatDeskUpdated(meta?.asOf);

  const liveBrief = brief || deskData?.brief;

  const bullishCards = useMemo(
    () => buildBullishBiasCards({ symbol, technical, selectedNews, brief: liveBrief, prices }),
    [symbol, technical, selectedNews, liveBrief, prices],
  );

  const bearishCards = useMemo(
    () => buildBearishBiasCards({ symbol, technical, brief: liveBrief, prices }),
    [symbol, technical, liveBrief, prices],
  );

  const primaryBull = prioritizeBiasCards(bullishCards, 2, [
    /support at/i,
    /risk-on regime/i,
    /timeframes aligned/i,
    /higher timeframe/i,
  ]);
  const primaryBear = prioritizeBiasCards(bearishCards, 2, [
    /htf bearish/i,
    /rejection at/i,
    /risk-off/i,
    /ltf bearish/i,
  ]);
  const extraBear = bearishCards.slice(2);
  const visibleBear = showMoreBear ? bearishCards : primaryBear;

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
            <h3 className="insidr-desk-bias__headline">
              The day trading bias on <strong>{symbol}</strong> is{' '}
              <span className={`insidr-desk-bias__pill ${phrase.className}`}>{phrase.text}</span>
            </h3>
            <p className="insidr-desk-bias__updated">Updated {updatedLabel}</p>

            <div className="insidr-desk-bias__columns">
              <div className="insidr-desk-bias__col insidr-desk-bias__col--bull">
                <h4>
                  What supports the{' '}
                  <span className="insidr-desk-bias__word-pill insidr-desk-bias__word-pill--bull">bias</span>?
                </h4>
                <div className="insidr-desk-bias__card-stack">
                  {primaryBull.map((card) => (
                    <BiasFactorCard key={card.title} card={card} variant="bull" />
                  ))}
                </div>
              </div>
              <div className="insidr-desk-bias__col insidr-desk-bias__col--bear">
                <h4>
                  What could flip it{' '}
                  <span className="insidr-desk-bias__word-pill insidr-desk-bias__word-pill--bear">bearish</span>?
                </h4>
                <div className="insidr-desk-bias__card-stack">
                  {visibleBear.map((card) => (
                    <BiasFactorCard key={card.title} card={card} variant="bear" />
                  ))}
                </div>
                {extraBear.length > 0 && (
                  <button
                    type="button"
                    className="insidr-desk-bias__more"
                    onClick={() => setShowMoreBear((v) => !v)}
                  >
                    {showMoreBear ? 'Show less' : `Show ${extraBear.length} more`}
                    <ChevronDown size={12} className={showMoreBear ? 'rotate-180' : ''} />
                  </button>
                )}
              </div>
            </div>
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
