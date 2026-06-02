import React from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, RefreshCw, ArrowRight, TrendingUp, Zap, Landmark, Bookmark, WifiOff } from 'lucide-react';
import { NEWS_TAB_CONFIG, formatAssetPct } from '../../utils/newsAssets.js';

const TAB_ICONS = {
  all: Newspaper,
  popular: TrendingUp,
  breaking: Zap,
  high: Zap,
  econ: Landmark,
};

const EMPTY_COPY = {
  wire: {
    title: 'Headlines syncing',
    hint: 'Live wire is connecting. Your chart and desk still update from market data.',
  },
  filter: {
    title: 'No headlines in this filter',
    hint: 'Try another tab or show all headlines.',
  },
  saved: {
    title: 'No saved headlines yet',
    hint: 'Tap the bookmark on any story to save it here.',
  },
  search: {
    title: 'No search matches',
    hint: 'Try different keywords or clear your search.',
  },
};

const NewsTabEmptyState = ({
  tab,
  mode = 'filter',
  hasItemsInOtherTabs,
  onShowAll,
  onReload,
  onClearSaved,
  loading,
  prices = {},
  deskAsset = 'XAUUSD',
}) => {
  const cfg = NEWS_TAB_CONFIG[tab] || NEWS_TAB_CONFIG.all;
  const Icon = mode === 'wire' ? WifiOff : TAB_ICONS[tab] || Newspaper;
  const copy = EMPTY_COPY[mode] || EMPTY_COPY.filter;
  const showMovers = mode === 'filter' && tab !== 'all';

  return (
    <div className="mrkt-news__empty-block">
      <div className="mrkt-news__empty-visual">
        <Icon size={28} className="mrkt-news__empty-icon" aria-hidden />
        <h3 className="mrkt-news__empty-title">{copy.title}</h3>
        <p className="mrkt-news__empty-hint">{copy.hint}</p>
      </div>

      {showMovers && (
        <div className="mrkt-news__empty-assets">
          <p className="mrkt-news__empty-assets-label">Typical movers for {cfg.label}</p>
          <div className="mrkt-news__tickers mrkt-news__tickers--empty">
            {(cfg.assets || []).slice(0, 6).map((sym) => {
              const { label, changePct } = formatAssetPct(sym, prices);
              const dir = changePct > 0.02 ? 'up' : changePct < -0.02 ? 'down' : 'neutral';
              return (
                <span key={sym} className={`mrkt-news__empty-chip mrkt-news__empty-chip--${dir}`}>
                  {sym} {label}
                </span>
              );
            })}
            <span className="mrkt-news__empty-chip mrkt-news__empty-chip--desk">{deskAsset} desk</span>
          </div>
        </div>
      )}

      <div className="mrkt-news__empty-actions">
        {hasItemsInOtherTabs && (
          <button type="button" className="mrkt-news__empty-btn" onClick={onShowAll}>
            Show all headlines <ArrowRight size={12} />
          </button>
        )}
        {mode === 'saved' && onClearSaved && (
          <button type="button" className="mrkt-news__empty-btn mrkt-news__empty-btn--ghost" onClick={onClearSaved}>
            <Bookmark size={12} /> Show all headlines
          </button>
        )}
        <button type="button" className="mrkt-news__empty-btn mrkt-news__empty-btn--ghost" onClick={onReload} disabled={loading}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh wire
        </button>
        <Link to="/dashboard/news" className="mrkt-news__empty-btn mrkt-news__empty-btn--ghost">
          Full news page <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
};

export default NewsTabEmptyState;
