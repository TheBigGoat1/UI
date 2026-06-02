import React from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, RefreshCw, ArrowRight, TrendingUp, Zap, Landmark } from 'lucide-react';
import { NEWS_TAB_CONFIG, formatAssetPct } from '../../utils/newsAssets.js';

const TAB_ICONS = {
  all: Newspaper,
  popular: TrendingUp,
  breaking: Zap,
  high: Zap,
  econ: Landmark,
};

const NewsTabEmptyState = ({
  tab,
  hasItemsInOtherTabs,
  onShowAll,
  onReload,
  loading,
  prices = {},
  deskAsset = 'XAUUSD',
}) => {
  const cfg = NEWS_TAB_CONFIG[tab] || NEWS_TAB_CONFIG.all;
  const Icon = TAB_ICONS[tab] || Newspaper;
  const assets = cfg.assets || [];

  return (
    <div className="mrkt-news__empty-block">
      <div className="mrkt-news__empty-visual">
        <Icon size={28} className="mrkt-news__empty-icon" aria-hidden />
        <h3 className="mrkt-news__empty-title">{cfg.label} — no matches right now</h3>
        <p className="mrkt-news__empty-hint">{cfg.hint}</p>
      </div>

      <div className="mrkt-news__empty-assets">
        <p className="mrkt-news__empty-assets-label">Typical movers for this filter</p>
        <div className="mrkt-news__tickers mrkt-news__tickers--empty">
          {assets.slice(0, 6).map((sym) => {
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

      <div className="mrkt-news__empty-actions">
        {hasItemsInOtherTabs && (
          <button type="button" className="mrkt-news__empty-btn" onClick={onShowAll}>
            Show all headlines <ArrowRight size={12} />
          </button>
        )}
        <button type="button" className="mrkt-news__empty-btn mrkt-news__empty-btn--ghost" onClick={onReload} disabled={loading}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh wire
        </button>
        <Link to="/dashboard/news" className="mrkt-news__empty-btn mrkt-news__empty-btn--ghost">
          Open News page <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
};

export default NewsTabEmptyState;
