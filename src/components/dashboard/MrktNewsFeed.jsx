import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  Landmark,
  ArrowRight,
  Bookmark,
  Check,
  Search,
  Loader2,
  AlertCircle,
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
import { userMessageFromError } from '../../utils/apiError.js';

const NEWS_POLL_MS = 12000;

const TABS = [
  { id: 'all', label: 'All', icon: null },
  { id: 'breaking', label: 'Breaking', icon: null, dot: true },
  { id: 'high', label: 'High Impact', icon: Zap, iconClass: 'text-red-400' },
  { id: 'econ', label: 'Economic', icon: Landmark, iconClass: 'text-[#8b5cf6]' },
];

function showAssetsOnCard(item, idx, tab) {
  if (idx === 0) return true;
  if (isBreakingItem(item)) return true;
  if (tab === 'breaking' && idx < 2) return true;
  return false;
}

const MrktNewsFeed = ({
  asset,
  wireItems = null,
  wireLoading = false,
  onWireSync,
  canAiInsight = true,
  onUpgrade,
  onSelectAsset,
  selectedNews,
  onNewsSelect,
  marketContext,
  prices: pricesProp,
  newsError,
  onNewsRefresh,
}) => {
  const useWire = wireItems != null;
  const [tab, setTab] = useState('all');
  const [localItems, setLocalItems] = useState([]);
  const [localLoading, setLocalLoading] = useState(!useWire);
  const [feedError, setFeedError] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const prices = pricesProp || {};
  const [toast, setToast] = useState(null);

  const items = useWire ? wireItems : localItems;
  const loading = useWire ? wireLoading : localLoading;
  const activeError = feedError || newsError || '';

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const loadLocal = useCallback(async () => {
    setLocalLoading(true);
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
      setLocalItems(Array.isArray(rows) ? rows : []);
      setFeedError('');
    } catch (err) {
      setFeedError(userMessageFromError(err, 'News feed reconnecting. Tap sync to retry.'));
    } finally {
      setLocalLoading(false);
    }
  }, [asset]);

  const syncWire = useCallback(() => {
    if (useWire) {
      onWireSync?.();
      onNewsRefresh?.();
      return;
    }
    loadLocal();
    onNewsRefresh?.();
  }, [useWire, onWireSync, onNewsRefresh, loadLocal]);

  useEffect(() => {
    if (useWire) return undefined;
    loadLocal();
    const id = setInterval(loadLocal, NEWS_POLL_MS);
    return () => clearInterval(id);
  }, [loadLocal, useWire]);

  useEffect(() => {
    setBookmarks(getBookmarks());
  }, [savedOnly]);

  const filtered = useMemo(() => {
    let list = tab === 'all' ? items : items.filter((item) => matchesNewsTab(item, tab));
    if (savedOnly) {
      const ids = new Set(bookmarks.map((b) => b.id));
      list = list.filter((item) => ids.has(articleId(item)));
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((item) => {
        const text = `${item.title || ''} ${item.description || item.summary || ''}`.toLowerCase();
        return text.includes(q);
      });
    }
    return list;
  }, [items, tab, savedOnly, bookmarks, searchQuery]);

  const hasItemsInOtherTabs = tab !== 'all' && items.length > 0 && filtered.length === 0;
  const emptyMode = useMemo(() => {
    if (searchQuery.trim()) return 'search';
    if (savedOnly) return 'saved';
    if (items.length === 0) return 'wire';
    return 'filter';
  }, [searchQuery, savedOnly, items.length]);

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
        <h2 className="mrkt-news__title">News Feed</h2>
        <div className="mrkt-news__actions">
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

      {activeError && (
        <div className="mrkt-news__sync-row mrkt-news__sync-row--warn" role="alert">
          <AlertCircle size={12} aria-hidden />
          <span>{activeError}</span>
          <button type="button" className="mrkt-news__sync-btn" onClick={syncWire}>
            Retry wire
          </button>
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
              mode={emptyMode}
              hasItemsInOtherTabs={hasItemsInOtherTabs}
              onShowAll={() => {
                setTab('all');
                setSavedOnly(false);
                setSearchQuery('');
                setSearchOpen(false);
              }}
              onClearSaved={() => setSavedOnly(false)}
              onReload={syncWire}
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
                  highlight={idx === 0 && tab === 'all'}
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
          Trade ideas
          <ArrowRight size={12} aria-hidden />
        </Link>
        <Link to="/dashboard/news" className="mrkt-news__footer-link">
          Full news page
          <ArrowRight size={12} aria-hidden />
        </Link>
      </footer>
    </aside>
  );
};

export default MrktNewsFeed;
