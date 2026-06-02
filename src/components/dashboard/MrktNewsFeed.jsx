import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Zap,
  Landmark,
  ArrowRight,
  Bookmark,
  Check,
  Info,
  Filter,
  Search,
  Volume2,
  VolumeX,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { api } from '../../services/api/api.js';
import MrktNewsCard from './MrktNewsCard.jsx';
import NewsTabEmptyState from './NewsTabEmptyState.jsx';
import { getBookmarks, articleId } from '../../utils/newsBookmarks.js';
import {
  matchesNewsTab,
  primaryAssetForNews,
  isBreakingItem,
} from '../../utils/newsAssets.js';

const TABS = [
  { id: 'all', label: 'All', icon: null },
  { id: 'popular', label: 'Popular', icon: TrendingUp, iconClass: 'text-orange-400' },
  { id: 'breaking', label: 'Breaking News', icon: null, dot: true },
  { id: 'high', label: 'High Impact', icon: Zap, iconClass: 'text-red-400' },
  { id: 'econ', label: 'Economic Data', icon: Landmark, iconClass: 'text-[#8b5cf6]' },
];

function isHighlightCard(item, tab, idx) {
  if (tab === 'breaking') return idx > 0 && idx < 4;
  const score = Math.abs(item?.sentiment_score ?? 0);
  if (score > 0.35 && idx > 0 && idx < 3) return true;
  if (tab === 'high' && idx > 0 && idx < 2) return true;
  return false;
}

function showAssetsOnCard(item, idx, tab) {
  if (idx === 0) return true;
  if (isBreakingItem(item)) return true;
  if (tab === 'breaking' && idx < 2) return true;
  return false;
}

const MrktNewsFeed = ({
  asset,
  canAiInsight = true,
  onUpgrade,
  onSelectAsset,
  selectedNews,
  onNewsSelect,
  marketContext,
  prices: pricesProp,
}) => {
  const [tab, setTab] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedOnly, setSavedOnly] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBreaking, setFilterBreaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const prices = pricesProp || {};
  const [toast, setToast] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const hasItemsInOtherTabs = tab !== 'all' && items.length > 0 && filtered.length === 0;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let rows = [];
      if (asset) {
        const res = await api.news.getByAssetPath(asset, { page: 1, limit: 40 });
        rows = res?.data || [];
      }
      if (!rows.length) {
        const res = await api.news.getAll({ page: 1, limit: 40 });
        rows = res?.data || [];
      }
      if (!rows.length) {
        const live = await api.news.getFeed(24);
        rows = live?.data || [];
      }
      setItems(Array.isArray(rows) ? rows : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [asset]);

  useEffect(() => {
    load();
    setBookmarks(getBookmarks());
    const id = setInterval(load, 120000);
    return () => clearInterval(id);
  }, [load]);

  const filtered = useMemo(() => {
    let list = tab === 'all' ? items : items.filter((item) => matchesNewsTab(item, tab));
    if (savedOnly) {
      const ids = new Set(bookmarks.map((b) => b.id));
      list = list.filter((item) => ids.has(articleId(item)));
    }
    if (filterBreaking) {
      list = list.filter((item) => isBreakingItem(item));
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((item) => {
        const text = `${item.title || ''} ${item.description || item.summary || ''}`.toLowerCase();
        return text.includes(q);
      });
    }
    return list;
  }, [items, tab, savedOnly, bookmarks, filterBreaking, searchQuery]);

  const tabCounts = useMemo(() => {
    const counts = { all: items.length };
    TABS.forEach((t) => {
      if (t.id === 'all') return;
      counts[t.id] = items.filter((item) => matchesNewsTab(item, t.id)).length;
    });
    return counts;
  }, [items]);

  const selectedId = selectedNews ? articleId(selectedNews) : null;

  const handleNewsActivate = (item) => {
    const primary = primaryAssetForNews(item, asset, tab);
    onNewsSelect?.(item, primary);
    onSelectAsset?.(primary);
  };

  const handleAssetFromNews = (item, sym) => {
    onNewsSelect?.(item, sym);
    onSelectAsset?.(sym);
    showToast(`Chart: ${sym}`);
  };

  return (
    <aside className="mrkt-news insidr-news-feed" aria-label="Insidr news feed">
      {toast && (
        <div className="mrkt-news__toast" role="status">
          <Check size={14} />
          {toast}
        </div>
      )}

      <div className="mrkt-news__head">
        <h2 className="mrkt-news__title">
          News Feed
          <button
            type="button"
            className={`mrkt-news__info ${infoOpen ? 'mrkt-news__info--on' : ''}`}
            title="Insidr wires headlines with desk context and analysis"
            aria-label="About news feed"
            aria-expanded={infoOpen}
            onClick={() => setInfoOpen((v) => !v)}
          >
            <Info size={14} />
          </button>
        </h2>
        <div className="mrkt-news__actions">
          <button
            type="button"
            className={`mrkt-news__icon-btn ${filterBreaking ? 'mrkt-news__icon-btn--active' : ''}`}
            onClick={() => setFilterBreaking((v) => !v)}
            title="Breaking only"
            aria-label="Filter breaking news"
            aria-pressed={filterBreaking}
          >
            <Filter size={15} />
          </button>
          <button
            type="button"
            className={`mrkt-news__icon-btn ${searchOpen ? 'mrkt-news__icon-btn--active' : ''}`}
            onClick={() => setSearchOpen((v) => !v)}
            title="Search headlines"
            aria-label="Search"
            aria-expanded={searchOpen}
          >
            <Search size={15} />
          </button>
          <button
            type="button"
            className={`mrkt-news__icon-btn ${muted ? 'mrkt-news__icon-btn--active' : ''}`}
            onClick={() => {
              setMuted((v) => !v);
              showToast(muted ? 'Alerts on' : 'Headline alerts muted');
            }}
            title="Mute headline alerts"
            aria-label="Mute"
            aria-pressed={muted}
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <button
            type="button"
            className={`mrkt-news__icon-btn ${savedOnly ? 'mrkt-news__icon-btn--active' : ''}`}
            onClick={() => {
              setSavedOnly((v) => !v);
              setBookmarks(getBookmarks());
            }}
            title="Saved headlines"
            aria-label="Bookmarks"
            aria-pressed={savedOnly}
          >
            <Bookmark size={15} />
          </button>
        </div>
      </div>

      {infoOpen && (
        <div className="mrkt-news__info-panel" role="note">
          Live headlines for <strong>{asset}</strong> with Insidr Analysis (brain), bookmarks, and asset
          chips. Tabs filter by impact — empty tabs still show typical movers below.
        </div>
      )}

      {searchOpen && (
        <div className="mrkt-news__toolbar-extra">
          <input
            type="search"
            className="mrkt-news__search"
            placeholder="Search headlines…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search headlines"
          />
        </div>
      )}

      <div className="mrkt-news__tabs" role="tablist" aria-label="News categories">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`news-tab-${t.id}`}
              aria-selected={isActive}
              aria-controls="news-tab-panel"
              className={`mrkt-news__tab ${isActive ? 'mrkt-news__tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {Icon && <Icon size={12} className={t.iconClass} aria-hidden />}
              <span>{t.label}</span>
              <span className="mrkt-news__tab-count" aria-label={`${tabCounts[t.id] ?? 0} headlines`}>
                {tabCounts[t.id] ?? 0}
              </span>
              {t.dot && <span className="mrkt-news__tab-dot" aria-hidden />}
            </button>
          );
        })}
      </div>

      <div
        id="news-tab-panel"
        role="tabpanel"
        aria-labelledby={`news-tab-${tab}`}
        className="mrkt-news__tab-panel"
      >
        <div className="mrkt-news__scroll custom-scrollbar">
          {loading && !filtered.length ? (
            <div className="mrkt-news__loading">
              <Loader2 size={20} className="mrkt-news__loading-spin" aria-hidden />
              <span>Loading headlines…</span>
            </div>
          ) : !filtered.length ? (
            <NewsTabEmptyState
              tab={tab}
              hasItemsInOtherTabs={hasItemsInOtherTabs}
              onShowAll={() => setTab('all')}
              onReload={load}
              loading={loading}
              prices={prices}
              deskAsset={asset}
            />
          ) : (
            filtered.map((item, idx) => {
              const id = articleId(item);
              return (
                <MrktNewsCard
                  key={`${id}-${idx}`}
                  item={item}
                  highlight={isHighlightCard(item, tab, idx)}
                  breaking={isBreakingItem(item) || (tab === 'breaking' && idx === 0)}
                  showAssets={showAssetsOnCard(item, idx, tab)}
                  selected={selectedId === id}
                  deskAsset={asset}
                  activeTab={tab}
                  prices={prices}
                  marketContext={marketContext}
                  canAiInsight={canAiInsight}
                  onUpgrade={onUpgrade}
                  onToast={showToast}
                  onSelectAsset={(sym) => handleAssetFromNews(item, sym)}
                  onNewsActivate={handleNewsActivate}
                />
              );
            })
          )}
        </div>
      </div>

      <footer className="mrkt-news__footer">
        <Link to="/dashboard/ideas" className="mrkt-news__footer-link">
          <BarChart3 size={14} aria-hidden />
          View Market Recap
        </Link>
        <Link to="/dashboard/news" className="mrkt-news__footer-link">
          View Recent Headlines
          <ArrowRight size={12} aria-hidden />
        </Link>
      </footer>
    </aside>
  );
};

export default MrktNewsFeed;
