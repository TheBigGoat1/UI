import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Sparkles, Layers, Briefcase } from 'lucide-react';
import TradeIdeaCard from '../features/trades/TradeIdeaCard';
import IdeaDetailModal from '../features/trades/IdeaDetailModal';
import UpgradeGate from '../components/billing/UpgradeGate.jsx';
import { api } from '../services/api/api.js';
import { friendlyApiError } from '../hooks/useAssetAnalysis.js';
import { useEntitlements } from '../hooks/useEntitlements.js';
import { useTerminalRealtime } from '../hooks/useTerminalRealtime.js';

const CONFIDENCE_TIERS = [
  { id: 0, label: 'All' },
  { id: 50, label: '50%+' },
  { id: 70, label: '70%+' },
  { id: 85, label: '85%+' },
];

const CLASS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'forex', label: 'FX' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'commodity', label: 'Cmdty' },
  { id: 'index', label: 'Idx' },
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
  const [assetsMeta, setAssetsMeta] = useState([]);
  const [closingId, setClosingId] = useState(null);
  const [upgradeNotice, setUpgradeNotice] = useState('');
  const [statusNotice, setStatusNotice] = useState('');
  const [watchlistSymbols, setWatchlistSymbols] = useState([]);
  const [watchlistOnly, setWatchlistOnly] = useState(false);

  const focusSymbol = useMemo(() => {
    const focus = ideaList.find((i) => i.is_todays_focus);
    return focus?.asset || focus?.symbol || 'XAUUSD';
  }, [ideaList]);

  const { prices } = useTerminalRealtime(focusSymbol);

  useEffect(() => {
    api.trader
      .getWatchlist()
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          setWatchlistSymbols(res.data.map((row) => String(row.symbol || row).toUpperCase()));
        }
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
            entry_price: row.entry_price ?? row.idea?.entry_price,
            status: 'open',
          }));
          setIdeaList(mapped);
        } else {
          setIdeaList([]);
        }
        return;
      }

      const res = await api.tradeIdeas.getLatest(confidenceThreshold, assetClass, true);
      let rows = res?.success && Array.isArray(res.data) ? res.data : [];

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

      if (rows.length === 0 && res?.meta?.emptyHint) {
        setStatusNotice(res.meta.emptyHint);
      } else if (rows.length === 0 && (confidenceThreshold > 0 || assetClass !== 'all')) {
        setStatusNotice('No setups match filters — try All / All markets.');
      }
    } catch (error) {
      setIdeaList([]);
      setStatusNotice(friendlyApiError(error));
    } finally {
      setLoading(false);
    }
  }, [viewMode, confidenceThreshold, assetClass, classBySymbol]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  const handleCloseFromCard = async (idea) => {
    const positionId = idea.trade_id || idea.position_id;
    if (!positionId) return;
    setClosingId(positionId);
    try {
      const symbol = idea.asset || idea.symbol;
      let exit = Number(idea.entry_price);
      const q = await api.market.getQuote(symbol);
      if (q?.success && q.data?.price != null) exit = Number(q.data.price);
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
      setStatusNotice('Sign in to generate ideas.');
      return;
    }
    if (!canGenerateIdeas) {
      setUpgradeNotice('Idea generation requires Pro or Elite.');
      return;
    }

    setGenerating(true);
    setViewMode('latest');
    try {
      const res = await api.tradeIdeas.generate();
      if (res?.success) {
        setStatusNotice(res.message || (res.data?.length ? `Saved ${res.data.length} setups.` : 'Scan complete — no setups saved.'));
        await fetchIdeas();
      } else {
        setStatusNotice(friendlyApiError(res));
      }
    } catch (e) {
      if (e?.code === 'capability_required') setUpgradeNotice('Pro or Elite required.');
      else if (e?.status === 401) setStatusNotice('Sign in to generate ideas.');
      else setStatusNotice(friendlyApiError(e));
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  const watchlistRank = useMemo(() => {
    const map = {};
    watchlistSymbols.forEach((symbol, index) => {
      map[symbol] = index;
    });
    return map;
  }, [watchlistSymbols]);

  const displayedIdeaList = useMemo(() => {
    const sym = (idea) => String(idea.asset || idea.symbol || '').toUpperCase();
    let list = [...ideaList].sort((a, b) => {
      const af = a.is_todays_focus ? 1 : 0;
      const bf = b.is_todays_focus ? 1 : 0;
      if (bf !== af) return bf - af;
      const aw = watchlistRank[sym(a)] != null ? 1 : 0;
      const bw = watchlistRank[sym(b)] != null ? 1 : 0;
      if (bw !== aw) return bw - aw;
      return Number(b.confidence ?? 0) - Number(a.confidence ?? 0);
    });
    if (watchlistOnly && watchlistSymbols.length) {
      const set = new Set(watchlistSymbols);
      list = list.filter((idea) => set.has(sym(idea)));
    }
    return list;
  }, [ideaList, watchlistRank, watchlistOnly, watchlistSymbols]);

  const focusIdea = displayedIdeaList.find((i) => i.is_todays_focus);
  const isBusy = loading || generating;
  const filtersActive = confidenceThreshold > 0 || assetClass !== 'all' || watchlistOnly;

  const clearFilters = () => {
    setConfidenceThreshold(0);
    setAssetClass('all');
    setWatchlistOnly(false);
  };

  const priceFor = (symbol) => {
    const s = String(symbol || '').toUpperCase();
    return prices[s]?.price ?? prices[`C:${s}`]?.price ?? null;
  };

  return (
    <div className="ideas-lab dash-page">
      <header className="ideas-lab__hero">
        <div className="ideas-lab__hero-copy">
          <h1>{viewMode === 'open' ? 'Open trades' : 'Trade signals'}</h1>
          <p>
            {viewMode === 'open'
              ? 'Manage active positions — close when your plan completes.'
              : 'Scan → review → backtest → accept. Decision support only.'}
          </p>
        </div>
        <div className="ideas-lab__actions">
          <div className="ideas-lab__view-tabs">
            <button
              type="button"
              className={`ideas-lab__view-tab ${viewMode === 'latest' ? 'is-active' : ''}`}
              onClick={() => setViewMode('latest')}
            >
              <Layers size={13} aria-hidden /> Signals
            </button>
            <button
              type="button"
              className={`ideas-lab__view-tab ${viewMode === 'open' ? 'is-active is-active--open' : ''}`}
              onClick={() => setViewMode('open')}
            >
              <Briefcase size={13} aria-hidden /> Open
            </button>
          </div>
          <button
            type="button"
            className="ideas-lab__btn ideas-lab__btn--ghost"
            onClick={fetchIdeas}
            disabled={isBusy}
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} aria-hidden />
          </button>
          {viewMode === 'latest' && (
            <button
              type="button"
              className="ideas-lab__btn ideas-lab__btn--primary"
              onClick={handleGenerate}
              disabled={isBusy}
            >
              <Sparkles size={15} aria-hidden />
              {generating ? 'Scanning…' : 'Generate'}
            </button>
          )}
        </div>
      </header>

      {viewMode === 'latest' && !canGenerateIdeas && isAuthenticated && (
        <UpgradeGate feature="ideas.generate" compact />
      )}

      {upgradeNotice && (
        <div className="ideas-lab__notice">
          {upgradeNotice}{' '}
          <Link to="/dashboard/pricing" className="text-primary font-bold hover:underline">
            Plans
          </Link>
        </div>
      )}

      {statusNotice && viewMode === 'latest' && (
        <div className="ideas-lab__notice ideas-lab__notice--info">{statusNotice}</div>
      )}

      {viewMode === 'latest' && focusIdea && (
        <div className="ideas-lab__focus-strip">
          <p>
            <span>Today&apos;s focus</span> — {focusIdea.asset || focusIdea.symbol}{' '}
            {focusIdea.direction} · {Math.round(focusIdea.confidence || 0)}%
          </p>
          <button
            type="button"
            className="ideas-lab__btn ideas-lab__btn--primary"
            onClick={() => setSelectedIdea(focusIdea)}
          >
            Review setup
          </button>
        </div>
      )}

      <div className="ideas-lab__workspace">
        {viewMode === 'latest' && (
          <aside className="ideas-lab__rail" aria-label="Filters">
            <div className="ideas-lab__rail-group">
              <span className="ideas-lab__rail-label">Confidence</span>
              <div className="ideas-lab__pills">
                {CONFIDENCE_TIERS.map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    className={`ideas-lab__pill ${confidenceThreshold === tier.id ? 'is-active' : ''}`}
                    onClick={() => setConfidenceThreshold(tier.id)}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="ideas-lab__rail-group">
              <span className="ideas-lab__rail-label">Market</span>
              <div className="ideas-lab__pills">
                {CLASS_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`ideas-lab__pill ${assetClass === tab.id ? 'is-active' : ''}`}
                    onClick={() => setAssetClass(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            {watchlistSymbols.length > 0 && (
              <div className="ideas-lab__rail-group">
                <span className="ideas-lab__rail-label">Watchlist</span>
                <button
                  type="button"
                  className={`ideas-lab__pill ${watchlistOnly ? 'is-active' : ''}`}
                  onClick={() => setWatchlistOnly((v) => !v)}
                >
                  {watchlistOnly ? 'Watch only' : 'All symbols'}
                </button>
              </div>
            )}
            {filtersActive && (
              <button type="button" className="ideas-lab__pill" onClick={clearFilters}>
                Clear
              </button>
            )}
            <span className="ideas-lab__count">{displayedIdeaList.length} setups</span>
          </aside>
        )}

        <section className="ideas-lab__grid" aria-live="polite">
          {isBusy && displayedIdeaList.length === 0 ? (
            [1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="idea-card animate-pulse"
                style={{ minHeight: 280, opacity: 0.35 }}
                aria-hidden
              />
            ))
          ) : displayedIdeaList.length > 0 ? (
            displayedIdeaList.map((idea, idx) => {
              const symbol = String(idea.asset || idea.symbol || '').toUpperCase();
              return (
                <TradeIdeaCard
                  key={idea.trade_id || idea.id || `${symbol}-${idx}`}
                  idea={idea}
                  isWatchlist={watchlistRank[symbol] != null}
                  livePrice={priceFor(symbol)}
                  onClick={() => setSelectedIdea(idea)}
                  isOpenTrade={viewMode === 'open'}
                  onCloseTrade={handleCloseFromCard}
                  closing={closingId === (idea.trade_id || idea.position_id)}
                />
              );
            })
          ) : (
            <div className="ideas-lab__empty">
              <h3>{viewMode === 'open' ? 'No open trades' : 'No signals yet'}</h3>
              <p>
                {viewMode === 'open'
                  ? 'Accept a setup from any card to track it here.'
                  : filtersActive
                    ? 'Widen filters or generate a fresh scan.'
                    : 'Hit Generate to scan markets for setups.'}
              </p>
              {viewMode === 'latest' && (
                <div className="ideas-lab__actions" style={{ justifyContent: 'center', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="ideas-lab__btn ideas-lab__btn--primary"
                    onClick={handleGenerate}
                    disabled={generating}
                  >
                    {generating ? 'Scanning…' : 'Generate now'}
                  </button>
                  {filtersActive && (
                    <button type="button" className="ideas-lab__btn ideas-lab__btn--ghost" onClick={clearFilters}>
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <IdeaDetailModal
        isOpen={!!selectedIdea}
        onClose={() => {
          setSelectedIdea(null);
          if (viewMode === 'open') fetchIdeas();
        }}
        idea={selectedIdea}
        livePrice={selectedIdea ? priceFor(selectedIdea.asset || selectedIdea.symbol) : null}
        onTradeClosed={() => {
          setSelectedIdea(null);
          setViewMode('open');
          fetchIdeas();
        }}
        onAccepted={() => {
          setViewMode('open');
          setStatusNotice('Trade accepted — see Open tab or Journal.');
          fetchIdeas();
        }}
      />
    </div>
  );
};

export default Ideas;
