import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  Landmark,
  TrendingUp,
  ArrowRight,
  Bookmark,
  Check,
  Search,
  Loader2,
  AlertCircle,
  Brain,
  Filter,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { api } from '../../services/api/api.js';
import MrktNewsCard from './MrktNewsCard.jsx';
import NewsTabEmptyState from './NewsTabEmptyState.jsx';
import InsidrNewsAnalysis from './InsidrNewsAnalysis.jsx';
import { getBookmarks, articleId } from '../../utils/newsBookmarks.js';
import {
  matchesNewsTab,
  primaryAssetForNews,
  isBreakingItem,
} from '../../utils/newsAssets.js';
import { userMessageFromError } from '../../utils/apiError.js';

const NEWS_POLL_MS = 12000;
const MUTE_KEY = 'insidr_news_muted';

export const LIVE_NEWS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'popular', label: 'Popular', icon: TrendingUp },
  { id: 'breaking', label: 'Breaking News', dot: true },
  { id: 'high', label: 'High Impact', icon: Zap, iconClass: 'text-red-400' },
  { id: 'econ', label: 'Economic Data', icon: Landmark, iconClass: 'text-violet-400' },
];

function showAssetsOnCard(item, idx, tab) {
  if (idx === 0) return true;
  if (isBreakingItem(item)) return true;
  if (tab === 'breaking' && idx < 2) return true;
  return false;
}

function buildRecapArticle(items = []) {
  const top = items.slice(0, 8);
  const title = 'Market Recap — live wire snapshot';
  const summary = top.length
    ? top.map((row, i) => `${i + 1}. ${row.title || 'Headline'}`).join('\n')
    : 'No headlines on the wire yet.';
  return {
    id: 'market-recap',
    title,
    description: summary,
    summary,
    publishedAt: new Date().toISOString(),
    symbols: top.flatMap((row) => row.symbols || row.assets || []).slice(0, 12),
  };
}

const MrktLiveNews = ({
  variant = 'sidebar',
  asset = 'XAUUSD',
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
  defaultSearch = '',
}) => {
  const isPage = variant === 'page';
  const useWire = wireItems != null;
  const [tab, setTab] = useState('all');
  const [localItems, setLocalItems] = useState([]);
  const [localLoading, setLocalLoading] = useState(!useWire);
  const [feedError, setFeedError] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [searchOpen, setSearchOpen] = useState(isPage || Boolean(defaultSearch));
  const [searchQuery, setSearchQuery] = useState(defaultSearch);
  const [recapOpen, setRecapOpen] = useState(false);
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      return false;
    }
  });
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
      const mergeByUrl = (lists) => {
        const map = new Map();
        for (const list of lists) {
          for (const row of list || []) {
            const key = row?.url || row?.title;
            if (key && !map.has(key)) map.set(key, row);
          }
        }
        return Array.from(map.values()).sort(
          (a, b) =>
            new Date(b.publishedAt || b.time || 0).getTime() -
            new Date(a.publishedAt || a.time || 0).getTime(),
        );
      };

      let rows = [];
      if (asset) {
        const res = await api.news.getByAssetPath(asset, { page: 1, limit: 50, fresh: 1 });
        rows = res?.data || [];
      }
      if (rows.length < 8) {
        const live = await api.news.getFeed(40);
        rows = mergeByUrl([rows, live?.data || []]);
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

  useEffect(() => {
    setSearchQuery(defaultSearch);
    if (defaultSearch) setSearchOpen(true);
  }, [defaultSearch]);

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
        const syms = (item.symbols || item.assets || []).join(' ').toLowerCase();
        return text.includes(q) || syms.includes(q);
      });
    }
    return list;
  }, [items, tab, savedOnly, bookmarks, searchQuery]);

  const recapArticle = useMemo(() => buildRecapArticle(filtered.length ? filtered : items), [filtered, items]);

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

  const toggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(MUTE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      showToast(next ? 'Headline alerts muted' : 'Headline alerts on');
      return next;
    });
  };

  const handleRecap = () => {
    if (!canAiInsight) {
      onUpgrade?.('news.ai_insight');
      return;
    }
    setRecapOpen((v) => !v);
  };

  const rootClass = isPage ? 'live-news live-news--page' : 'live-news live-news--sidebar';

  return (
    <div className={rootClass}>
      {toast && (
        <div className="mrkt-news__toast" role="status">
          <Check size={14} />
          {toast}
        </div>
      )}

      {isPage ? (
        <header className="live-news__hero">
          <div className="live-news__hero-text">
            <h1 className="live-news__hero-title">Live News</h1>
            <p className="live-news__hero-sub">Real-time market headlines</p>
          </div>
          <div className="live-news__hero-tools">
            <label className="live-news__search-wrap">
              <Search size={15} aria-hidden />
              <input
                type="search"
                placeholder="Search symbols"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search symbols and headlines"
              />
            </label>
            <button
              type="button"
              className={`live-news__recap-btn ${recapOpen ? 'live-news__recap-btn--open' : ''}`}
              onClick={handleRecap}
              aria-expanded={recapOpen}
            >
              <Brain size={15} aria-hidden />
              Market Recap
            </button>
          </div>
        </header>
      ) : null}

      {isPage && recapOpen && (
        <div className="live-news__recap-panel">
          <InsidrNewsAnalysis
            article={recapArticle}
            asset={asset}
            prices={prices}
            marketContext={marketContext}
            onClose={() => setRecapOpen(false)}
            onSelectAsset={onSelectAsset}
            variant="feed"
          />
        </div>
      )}

      <aside className="mrkt-news insidr-news-feed" aria-label="Live news feed">
        {!isPage && (
          <div className="mrkt-news__head mrkt-news__head--compact">
            <h2 className="mrkt-news__title mrkt-news__title--live">
              Live News
              <span>Real-time market headlines</span>
            </h2>
            <div className="mrkt-news__actions">
              <button
                type="button"
                className={`mrkt-news__icon-btn mrkt-news__icon-btn--util ${
                  recapOpen ? 'mrkt-news__icon-btn--active' : ''
                } mrkt-news__icon-btn--accent`}
                onClick={handleRecap}
                title="Market Recap"
                aria-label="Market Recap"
                aria-expanded={recapOpen}
              >
                <Brain size={15} />
              </button>
            </div>
          </div>
        )}

        {!isPage && recapOpen && (
          <div className="mrkt-news__toolbar-extra">
            <InsidrNewsAnalysis
              article={recapArticle}
              asset={asset}
              prices={prices}
              marketContext={marketContext}
              onClose={() => setRecapOpen(false)}
              onSelectAsset={onSelectAsset}
              variant="feed"
            />
          </div>
        )}

        {activeError && (
          <div className="mrkt-news__sync-row mrkt-news__sync-row--warn" role="alert">
            <AlertCircle size={12} aria-hidden />
            <span>{activeError}</span>
            <button type="button" className="mrkt-news__sync-btn" onClick={syncWire}>
              Retry wire
            </button>
          </div>
        )}

        {!isPage && searchOpen && (
          <div className="mrkt-news__toolbar-extra">
            <input
              type="search"
              className="mrkt-news__search"
              placeholder="Search symbols…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search headlines"
            />
          </div>
        )}

        <div className="mrkt-news__tabs-row">
          <div className="mrkt-news__tabs" role="tablist" aria-label="News categories">
            {LIVE_NEWS_TABS.map((t) => {
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
          <div className="mrkt-news__tab-util" aria-label="Feed utilities">
            {!isPage && (
              <button
                type="button"
                className={`mrkt-news__icon-btn mrkt-news__icon-btn--util ${
                  searchOpen ? 'mrkt-news__icon-btn--active' : ''
                }`}
                onClick={() => setSearchOpen((v) => !v)}
                title="Search"
                aria-label="Search"
                aria-expanded={searchOpen}
              >
                <Search size={15} />
              </button>
            )}
            <button
              type="button"
              className={`mrkt-news__icon-btn mrkt-news__icon-btn--util ${
                savedOnly ? 'mrkt-news__icon-btn--active' : ''
              }`}
              onClick={() => {
                setSavedOnly((v) => !v);
                setBookmarks(getBookmarks());
              }}
              title="Bookmarks"
              aria-label="Bookmarks"
              aria-pressed={savedOnly}
            >
              <Bookmark size={15} />
            </button>
            <button
              type="button"
              className={`mrkt-news__icon-btn mrkt-news__icon-btn--util ${
                muted ? 'mrkt-news__icon-btn--muted' : ''
              }`}
              onClick={toggleMute}
              title={muted ? 'Unmute alerts' : 'Mute alerts'}
              aria-label={muted ? 'Unmute alerts' : 'Mute alerts'}
              aria-pressed={muted}
            >
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <button
              type="button"
              className={`mrkt-news__icon-btn mrkt-news__icon-btn--util ${
                searchOpen && !isPage ? 'mrkt-news__icon-btn--active' : ''
              }`}
              onClick={() => {
                if (isPage) {
                  document.querySelector('.live-news__search-wrap input')?.focus();
                  return;
                }
                setSearchOpen((v) => !v);
              }}
              title="Filter"
              aria-label="Filter"
              aria-expanded={searchOpen}
            >
              <Filter size={15} />
            </button>
          </div>
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
                  setSearchOpen(isPage);
                }}
                onClearSaved={() => setSavedOnly(false)}
                onReload={syncWire}
                loading={loading}
                prices={prices}
                deskAsset={asset}
              />
            ) : (
              <div className="mrkt-news__timeline">
                {filtered.map((item, idx) => {
                  const id = articleId(item);
                  return (
                    <div key={`${id}-${idx}`} className="mrkt-news__timeline-item">
                      <span className="mrkt-news__timeline-node" aria-hidden />
                      <MrktNewsCard
                        item={item}
                        wireHeadline
                        highlight={idx === 0 && (tab === 'all' || isBreakingItem(item))}
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {!isPage && (
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
        )}
      </aside>
    </div>
  );
};

export default MrktLiveNews;
