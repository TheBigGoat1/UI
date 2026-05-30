import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Lightbulb,
  RefreshCw,
  Sparkles,
  Briefcase,
  Layers,
  Bitcoin,
  Info,
  Filter,
  Star,
  ListFilter,
} from 'lucide-react';
import TradeIdeaCard from '../features/trades/TradeIdeaCard';
import IdeaDetailModal from '../features/trades/IdeaDetailModal';
import DailyBriefPanel from '../components/brief/DailyBriefPanel';
import EventGateBanner from '../components/trading/EventGateBanner';
import PageHeader from '../components/layout/PageHeader';
import { api } from '../services/api/api.js';
import { friendlyApiError } from '../hooks/useAssetAnalysis.js';
import { useEntitlements } from '../hooks/useEntitlements.js';
import UpgradeGate from '../components/billing/UpgradeGate.jsx';

const CONFIDENCE_TIERS = [
  { id: 0, label: 'All', sub: 'Any confidence' },
  { id: 50, label: '50%+', sub: 'Medium+' },
  { id: 70, label: '70%+', sub: 'High' },
  { id: 85, label: '85%+', sub: 'Ultra' },
];

const CLASS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'forex', label: 'Forex' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'commodity', label: 'Commodities' },
  { id: 'index', label: 'Indices' },
];

const Ideas = () => {
  const { canGenerateIdeas, isAuthenticated } = useEntitlements();
  const [ideaList, setIdeaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [viewMode, setViewMode] = useState('latest');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0);
  const [assetClass, setAssetClass] = useState('all');
  const [aiEngine, setAiEngine] = useState('technical');
  const [assetsMeta, setAssetsMeta] = useState([]);
  const [closingId, setClosingId] = useState(null);
  const [upgradeNotice, setUpgradeNotice] = useState('');
  const [statusNotice, setStatusNotice] = useState('');
  const [listMeta, setListMeta] = useState(null);
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [watchlistSymbols, setWatchlistSymbols] = useState([]);
  const [watchlistOnly, setWatchlistOnly] = useState(false);

  useEffect(() => {
    api.trader
      .getWatchlist()
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          setWatchlistSymbols(res.data.map((row) => String(row.symbol || row).toUpperCase()));
        }
      })
      .catch(() => {});

    api.tradeIdeas
      .getEngineStatus()
      .then((res) => {
        if (res?.data?.provider) setAiEngine(res.data.provider);
      })
      .catch(() => {});

    api.market.getAssetsList().then((res) => {
      if (res?.success && Array.isArray(res.data)) setAssetsMeta(res.data);
    });
  }, []);

  const classBySymbol = useMemo(() => {
    const map = {};
    assetsMeta.forEach((a) => {
      map[a.asset] = a.class;
    });
    return map;
  }, [assetsMeta]);

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    setStatusNotice('');
    try {
      if (viewMode === 'open') {
        const res = await api.trades.getOpen();
        if (res.success && Array.isArray(res.data)) {
          const mapped = res.data.map((row) => ({
            ...(row.idea || row),
            trade_id: row.positionId || row.position_id || row.id,
            position_id: row.positionId || row.position_id,
            position_status: row.status,
            entry_price: row.entry_price ?? row.idea?.entry_price,
            status: 'open',
          }));
          setIdeaList(mapped);
        } else {
          setIdeaList([]);
        }
        setListMeta(null);
        return;
      }

      const res = await api.tradeIdeas.getLatest(
        confidenceThreshold,
        assetClass,
        viewMode === 'latest',
      );
      let rows = res?.success && Array.isArray(res.data) ? res.data : [];
      if (res?.meta?.brief) setBrief(res.meta.brief);

      rows = rows.filter((idea) => {
        const conf = Number(idea.confidence ?? idea.confluence_score ?? 0);
        if (conf < confidenceThreshold) return false;
        if (assetClass !== 'all') {
          const cls = idea.assetClass || classBySymbol[idea.asset || idea.symbol];
          if (cls !== assetClass) return false;
        }
        return true;
      });

      setIdeaList(rows);
      setListMeta(res?.meta || null);

      if (rows.length === 0 && res?.meta?.emptyHint) {
        setStatusNotice(res.meta.emptyHint);
      } else if (rows.length === 0 && (confidenceThreshold > 0 || assetClass !== 'all')) {
        setStatusNotice(
          'No ideas match your filters. Try confidence “All” and market “All”, or generate fresh ideas.',
        );
      }
    } catch (error) {
      console.error('Failed to fetch ideas:', error);
      setIdeaList([]);
      setStatusNotice(friendlyApiError(error));
    } finally {
      setLoading(false);
    }
  }, [viewMode, confidenceThreshold, assetClass, classBySymbol]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  useEffect(() => {
    if (viewMode !== 'latest') return;
    let active = true;
    setBriefLoading(true);
    api.brief
      .getDaily()
      .then((res) => {
        if (active && res?.success) setBrief(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setBriefLoading(false);
      });
    return () => {
      active = false;
    };
  }, [viewMode, ideaList.length]);

  const handleCloseFromCard = async (idea) => {
    const positionId = idea.trade_id || idea.position_id;
    if (!positionId) return;
    setClosingId(positionId);
    try {
      const symbol = idea.asset || idea.symbol;
      let exit = Number(idea.entry_price);
      const pricesRes = await api.market.getAllPrices();
      if (pricesRes?.success && pricesRes.data?.[symbol]?.price != null) {
        exit = Number(pricesRes.data[symbol].price);
      }
      const closeRes = await api.trades.close(positionId, exit);
      if (closeRes?.success) {
        await fetchIdeas();
        if (selectedIdea?.trade_id === positionId) setSelectedIdea(null);
      }
    } catch (e) {
      console.error('Close failed', e);
    } finally {
      setClosingId(null);
    }
  };

  const handleGenerate = async () => {
    setUpgradeNotice('');
    setStatusNotice('');

    if (!isAuthenticated) {
      setStatusNotice('Sign in to generate new trade ideas.');
      return;
    }

    if (!canGenerateIdeas) {
      setUpgradeNotice(
        'AI idea generation requires Pro or Elite. Browse existing ideas on Free, or start a trial on Plans.',
      );
      return;
    }

    setGenerating(true);
    setViewMode('latest');
    try {
      const res = await api.tradeIdeas.generate();
      if (res?.success) {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setIdeaList(res.data);
          setStatusNotice(res.message || `Generated ${res.data.length} ideas.`);
        } else {
          setStatusNotice(
            res.message ||
              res.meta?.emptyHint ||
              'Scan complete — no bullish/bearish setups saved (markets may be ranging).',
          );
        }
        await fetchIdeas();
      } else {
        setStatusNotice(friendlyApiError(res));
      }
    } catch (e) {
      if (e?.code === 'capability_required') {
        setUpgradeNotice(
          'Idea generation requires Pro or Elite. In development, sign in and use billing dev trial, or upgrade on Pricing.',
        );
      } else if (e?.status === 401) {
        setStatusNotice('Sign in to generate new trade ideas.');
      } else {
        setStatusNotice(friendlyApiError(e));
      }
      console.error(e);
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  const cryptoCount = assetsMeta.filter((a) => a.class === 'crypto').length;
  const isBusy = loading || generating;
  const filtersActive = confidenceThreshold > 0 || assetClass !== 'all' || watchlistOnly;

  const watchlistRank = useMemo(() => {
    const map = {};
    watchlistSymbols.forEach((symbol, index) => {
      map[symbol] = index;
    });
    return map;
  }, [watchlistSymbols]);

  const sortedIdeaList = useMemo(() => {
    const ideaSymbol = (idea) => String(idea.asset || idea.symbol || '').toUpperCase();

    return [...ideaList].sort((a, b) => {
      const af = a.is_todays_focus ? 1 : 0;
      const bf = b.is_todays_focus ? 1 : 0;
      if (bf !== af) return bf - af;

      const aRank = watchlistRank[ideaSymbol(a)];
      const bRank = watchlistRank[ideaSymbol(b)];
      const aWatch = aRank != null ? 1 : 0;
      const bWatch = bRank != null ? 1 : 0;
      if (bWatch !== aWatch) return bWatch - aWatch;
      if (aWatch && bWatch && aRank !== bRank) return aRank - bRank;

      return Number(b.confidence ?? b.confluence_score ?? 0) - Number(a.confidence ?? a.confluence_score ?? 0);
    });
  }, [ideaList, watchlistRank]);

  const displayedIdeaList = useMemo(() => {
    if (!watchlistOnly || !watchlistSymbols.length) return sortedIdeaList;
    const set = new Set(watchlistSymbols);
    return sortedIdeaList.filter((idea) =>
      set.has(String(idea.asset || idea.symbol || '').toUpperCase()),
    );
  }, [sortedIdeaList, watchlistOnly, watchlistSymbols]);

  const focusIdea = useMemo(() => {
    return displayedIdeaList.find((i) => i.is_todays_focus) || brief?.todaysFocus || null;
  }, [displayedIdeaList, brief]);

  const eventGateSymbol = focusIdea?.asset || focusIdea?.symbol || null;

  const emptyTitle =
    viewMode === 'open'
      ? 'No active trades'
      : filtersActive
        ? 'No ideas match these filters'
        : 'No trade ideas to show yet';

  const emptyBody =
    viewMode === 'open'
      ? 'Accept a setup from any signal card to track it here until you close the position.'
      : filtersActive
        ? 'Widen filters to “All” / “All markets”, or generate a fresh scan.'
        : statusNotice ||
          'Click Generate New Ideas to scan forex and crypto. The tab never goes blank — you will always see this guide when the list is empty.';

  return (
    <div className="dash-page space-y-8">
      <PageHeader
        icon={Lightbulb}
        title={viewMode === 'open' ? 'Active Positions' : 'AI Trade Signals'}
        description={
          viewMode === 'open'
            ? 'Monitor and manage your currently open trades.'
            : `Forex, commodities, indices & ${cryptoCount || 11} crypto pairs. Powered by ${aiEngine === 'claude' ? 'Claude' : 'technical + Binance'}.`
        }
        badge={
          <span className="badge-glow text-[10px] uppercase flex items-center gap-1">
            {aiEngine === 'claude' ? 'Claude AI' : 'Live models'}
            {cryptoCount > 0 && <span className="opacity-70">· {cryptoCount} crypto</span>}
          </span>
        }
        action={
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isBusy || viewMode === 'open'}
            className="btn-primary py-2.5 px-5 disabled:opacity-50"
            title={!canGenerateIdeas && isAuthenticated ? 'Requires Pro or Elite' : undefined}
          >
            {generating ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            {generating
              ? 'Scanning markets…'
              : !canGenerateIdeas && isAuthenticated
                ? 'Generate (Pro)'
                : 'Generate New Ideas'}
          </button>
        }
      />

      {viewMode === 'latest' && !canGenerateIdeas && isAuthenticated && (
        <UpgradeGate feature="ideas.generate" compact />
      )}

      {viewMode === 'latest' && <EventGateBanner symbol={eventGateSymbol} />}

      <p className="text-xs text-text-muted -mt-6">
        Trade ideas are decision support only — not investment advice.{' '}
        <Link to="/legal/risk" className="text-primary hover:underline">
          Risk Disclosure
        </Link>
        {' · '}
        <Link to="/dashboard/settings?tab=guide" className="text-primary hover:underline">
          Help: empty Ideas list
        </Link>
      </p>

      {viewMode === 'latest' && (
        <DailyBriefPanel
          brief={brief}
          loading={briefLoading && !brief}
          onFocusClick={(idea) => setSelectedIdea(idea)}
        />
      )}

      {viewMode === 'latest' && focusIdea && (
        <div className="rounded-xl border-2 border-primary/45 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase text-primary flex items-center gap-1.5 mb-1">
              <Star size={12} className="fill-primary" /> Today&apos;s focus
            </p>
            <p className="text-lg font-bold text-text-main">
              {focusIdea.asset || focusIdea.symbol}{' '}
              <span className="text-sm font-normal text-text-muted">
                · {focusIdea.direction} · {Math.round(focusIdea.confidence || 0)}% confidence
              </span>
            </p>
            <p className="text-xs text-text-muted mt-1 line-clamp-2 max-w-xl">
              {focusIdea.thesis || focusIdea.rationale || 'Highest-ranked setup in today\'s scan.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedIdea(focusIdea)}
            className="btn-primary text-sm py-2 px-4 shrink-0"
          >
            Review setup
          </button>
        </div>
      )}

      {listMeta?.suppressed?.length > 0 && viewMode === 'latest' && (
        <details className="rounded-lg border border-border/60 bg-surface/50 px-3 py-2 text-xs text-text-muted">
          <summary className="cursor-pointer text-primary font-bold">
            {listMeta.suppressed.length} correlated setup(s) held back
          </summary>
          <ul className="mt-2 space-y-1 list-disc pl-4">
            {listMeta.suppressed.map((s, i) => (
              <li key={`${s.symbol}-${i}`}>
                {s.symbol} — {s.label || s.reason}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="space-y-3 rounded-xl border border-border/60 bg-surface p-3">
        {upgradeNotice && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 flex flex-wrap items-center gap-2">
            <span>{upgradeNotice}</span>
            <Link to="/dashboard/pricing" className="text-primary font-bold hover:underline">
              View plans
            </Link>
          </div>
        )}

        {statusNotice && viewMode === 'latest' && (
          <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-text-muted flex gap-2">
            <Info size={14} className="text-primary shrink-0 mt-0.5" />
            <span>{statusNotice}</span>
          </div>
        )}

        {listMeta?.autoSeeded && ideaList.length === 0 && !statusNotice && (
          <div className="rounded-lg border border-border bg-background/40 px-3 py-2 text-xs text-text-muted">
            First visit: we ran an automatic market scan. No setups were saved — use Generate when
            trends develop.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-background rounded-md p-1 border border-border">
            <button
              type="button"
              onClick={() => setViewMode('latest')}
              className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-all ${
                viewMode === 'latest'
                  ? 'bg-primary text-white shadow'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <Layers size={12} /> Latest
            </button>
            <button
              type="button"
              onClick={() => setViewMode('open')}
              className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-all ${
                viewMode === 'open'
                  ? 'bg-surface-hover text-emerald-500 shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <Briefcase size={12} /> Open trades
            </button>
          </div>

          <button
            type="button"
            onClick={fetchIdeas}
            className="p-2 text-text-muted hover:text-primary rounded-lg hover:bg-surface-hover border border-border"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          {filtersActive && viewMode === 'latest' && (
            <button
              type="button"
              onClick={() => {
                setConfidenceThreshold(0);
                setAssetClass('all');
                setWatchlistOnly(false);
              }}
              className="text-xs text-primary font-bold flex items-center gap-1 hover:underline"
            >
              <Filter size={12} /> Clear filters
            </button>
          )}

          <span className="text-xs text-text-muted font-mono ml-auto">
            {isBusy ? '…' : `${displayedIdeaList.length} shown`}
            {viewMode === 'latest' && watchlistSymbols.length > 0 && !watchlistOnly && (
              <span className="hidden sm:inline text-primary/80"> · watchlist first</span>
            )}
          </span>
        </div>

        {viewMode === 'latest' && (
          <>
            <div className="flex flex-wrap gap-2 items-center">
              {watchlistSymbols.length > 0 && (
                <button
                  type="button"
                  onClick={() => setWatchlistOnly((v) => !v)}
                  className={`dash-filter-pill inline-flex items-center gap-1.5 ${
                    watchlistOnly ? 'dash-filter-pill--active' : ''
                  }`}
                  title={`Show only: ${watchlistSymbols.join(', ')}`}
                >
                  <ListFilter size={12} />
                  Watchlist only
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-bold uppercase text-text-muted self-center mr-1">
                Confidence
              </span>
              {CONFIDENCE_TIERS.map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setConfidenceThreshold(tier.id)}
                  className={`dash-filter-pill ${
                    confidenceThreshold === tier.id ? 'dash-filter-pill--active' : ''
                  }`}
                  title={tier.sub}
                >
                  {tier.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-bold uppercase text-text-muted self-center mr-1">
                Market
              </span>
              {CLASS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAssetClass(tab.id)}
                  className={`dash-filter-pill ${
                    assetClass === tab.id ? 'dash-filter-pill--active' : ''
                  }`}
                >
                  {tab.id === 'crypto' && <Bitcoin size={12} className="inline mr-1 -mt-px" />}
                  {tab.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {isBusy && ideaList.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-[300px] bg-surface rounded-xl animate-pulse border border-border" />
          ))}
        </div>
      ) : displayedIdeaList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedIdeaList.map((idea, idx) => {
            const symbol = String(idea.asset || idea.symbol || '').toUpperCase();
            return (
            <TradeIdeaCard
              key={idea.trade_id || idea.id || `${idea.asset}-${idx}`}
              idea={idea}
              isWatchlist={watchlistRank[symbol] != null}
              onClick={() => setSelectedIdea(idea)}
              isOpenTrade={viewMode === 'open'}
              onCloseTrade={handleCloseFromCard}
              closing={closingId === (idea.trade_id || idea.position_id)}
            />
            );
          })}
        </div>
      ) : (
        <div
          className="text-center py-16 text-text-muted card-modern flex flex-col items-center max-w-lg mx-auto border border-dashed border-border"
          role="status"
        >
          <Lightbulb size={48} className="mb-4 opacity-25 text-primary" />
          <h3 className="font-bold text-lg text-text-main">{emptyTitle}</h3>
          <p className="text-sm mt-3 leading-relaxed px-4">
            {watchlistOnly && watchlistSymbols.length
              ? 'No ideas on your watchlist right now. Turn off Watchlist only or generate a fresh scan.'
              : emptyBody}
          </p>
          {viewMode === 'latest' && (
            <div className="flex flex-wrap gap-3 mt-6 justify-center">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="btn-primary text-sm"
              >
                {generating ? 'Scanning…' : 'Generate now'}
              </button>
              {filtersActive && (
                <button
                  type="button"
                  onClick={() => {
                    setConfidenceThreshold(0);
                    setAssetClass('all');
                    setWatchlistOnly(false);
                  }}
                  className="btn-ghost text-sm"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
          <p className="text-[10px] text-text-muted mt-6 max-w-sm">
            {statusNotice
              ? 'Fix the issue above, then click Generate again.'
              : 'An empty list after Generate means no matching setups — not a broken page.'}
          </p>
        </div>
      )}

      <IdeaDetailModal
        isOpen={!!selectedIdea}
        onClose={() => {
          setSelectedIdea(null);
          if (viewMode === 'open') fetchIdeas();
        }}
        idea={selectedIdea}
        onTradeClosed={() => {
          setSelectedIdea(null);
          setViewMode('latest');
          fetchIdeas();
        }}
        onAccepted={() => {
          setViewMode('open');
          setStatusNotice('Trade accepted — view it under Open trades or in Journal.');
          fetchIdeas();
        }}
      />
    </div>
  );
};

export default Ideas;
