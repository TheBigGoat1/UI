import React, { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api/api.js';
import {
  Newspaper,
  RefreshCw,
  TrendingUp,
  Activity,
  Globe,
  Filter,
  Search,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  CircleDashed,
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import DashSelect from '../components/ui/DashSelect.jsx';

const News = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState('latest'); 
  const [selectedAsset, setSelectedAsset] = useState('EURUSD');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [assetList, setAssetList] = useState([]);
  const [sentimentData, setSentimentData] = useState(null);
  
  const [newsFeed, setNewsFeed] = useState([]);
  const [loading, setLoading] = useState(false); 
  const [isFetchingMore, setIsFetchingMore] = useState(false); 
  const [hasMore, setHasMore] = useState(true); 
  const [newsNotice, setNewsNotice] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [sourceFlags, setSourceFlags] = useState(null);
  const [connections, setConnections] = useState(null);
  const [articleTotal, setArticleTotal] = useState(null);
  const didAutoSync = useRef(false);

  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const loadConnections = async () => {
    try {
      const [conn, stats, sources] = await Promise.all([
        api.news.getConnections().catch(() => api.system.getDataSources()),
        api.news.getStats(),
        api.news.getSources(),
      ]);
      if (conn?.success) setConnections(conn.data);
      if (stats?.success) setArticleTotal(stats.data?.total ?? 0);
      if (sources?.success) setSourceFlags(sources.data);
    } catch {
      /* backend offline */
    }
  };

  const applyArticles = (raw) => {
    const dataArray = Array.isArray(raw) ? raw : [];
    setNewsFeed(dataArray);
    setHasMore(dataArray.length >= ITEMS_PER_PAGE);
    return dataArray.length;
  };

  useEffect(() => {
    api.market.getAssetsList().then((res) => {
      if (res.success && Array.isArray(res.data)) setAssetList(res.data);
    });
    loadConnections();
  }, []);

  useEffect(() => {
    if (searchParams.get('asset')) return;
    let active = true;
    api.trader
      .getWatchlist()
      .then((res) => {
        if (!active || !res?.success || !Array.isArray(res.data) || !res.data.length) return;
        const first = res.data[0].symbol || res.data[0];
        if (first) {
          setSelectedAsset(String(first).toUpperCase());
          setViewMode('asset');
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [searchParams]);

  useEffect(() => {
    const assetParam = searchParams.get('asset');
    if (!assetParam) return;
    const normalized = assetParam.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normalized) {
      setSelectedAsset(normalized);
      setViewMode('asset');
      setPage(1);
      setSearchQuery('');
    }
  }, [searchParams]);

  const fetchData = async () => {
    if (page === 1) {
        setLoading(true);
        setNewsFeed([]); 
    } else {
        setIsFetchingMore(true);
    }
    
    try {
      let newsRes;
      setNewsNotice('');

      if (searchQuery) {
        const assetFilter = viewMode === 'asset' ? selectedAsset : null;
        newsRes = await api.news.search(searchQuery, assetFilter); 
      } 
      else if (viewMode === 'latest') {
         newsRes = await api.news.getAll({ page, limit: ITEMS_PER_PAGE });
         if (page === 1) setSentimentData(null);
      } 
      else {
         const nRes = await api.news.getByAssetPath(selectedAsset, { page, limit: ITEMS_PER_PAGE });
         
         if (page === 1) {
             let sRes = null;
             try {
                 sRes = await api.sentiment.getForAsset(selectedAsset);
             } catch (err) {
                 console.warn("Sentiment fetch failed, skipping...", err);
             }
             setSentimentData(sRes?.success !== false ? (sRes?.data || sRes) : null);
         }
         newsRes = nRes;
      }

      if (newsRes && newsRes.success === false) {
        throw new Error(newsRes.error || 'Backend news fetch failed');
      }

      let rawData = newsRes?.data ?? newsRes;
      let dataArray = Array.isArray(rawData)
        ? rawData
        : rawData && typeof rawData === 'object'
          ? Object.values(rawData).filter((item) => item?.title)
          : [];

      if (page === 1 && dataArray.length === 0 && viewMode === 'latest' && !searchQuery) {
        const live = await api.news.getFeed(ITEMS_PER_PAGE);
        if (live?.success && Array.isArray(live.data) && live.data.length) {
          dataArray = live.data;
          setNewsNotice('Loaded live headlines from your API keys.');
        }
      }

      if (page === 1 && dataArray.length === 0) {
        setNewsFeed([]);
        setHasMore(false);
        setNewsNotice(
          'No headlines yet. Click Sync headlines — ensure npm run dev:all is running and NEWSAPI_API_KEY is set in UI-main/.env',
        );
        return;
      }

      if (page === 1) {
        applyArticles(dataArray);
      } else {
        setNewsFeed((prev) => [...prev, ...dataArray]);
        setHasMore(dataArray.length >= ITEMS_PER_PAGE);
      }

    } catch (e) {
      console.error('Data fetch failed', e);
      if (page === 1) {
        try {
          const live = await api.news.getFeed(ITEMS_PER_PAGE);
          if (live?.success && applyArticles(live.data || [])) {
            setNewsNotice('Showing live feed (database cache unavailable).');
            return;
          }
        } catch {
          /* ignore */
        }
        setNewsFeed([]);
        setNewsNotice(
          e.error || e.message || 'Start the API: npm run dev:all — then Sync headlines.',
        );
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [viewMode, selectedAsset, page, searchQuery]);

  const handleSyncNews = async () => {
    setSyncing(true);
    setNewsNotice('');
    try {
      const res = await api.news.sync();
      if (res?.success) {
        const parts = res.data?.breakdown
          ? Object.entries(res.data.breakdown)
              .map(([k, v]) => `${k}: ${v.ok ? v.count : v.error || '0'}`)
              .join(' · ')
          : '';
        const count = res.data?.totalFetched ?? 0;
        setNewsNotice(
          count > 0
            ? `Synced ${count} headlines (${res.data?.synced ?? 0} stored). ${parts}`
            : `No articles returned. Check .env keys. ${parts}`,
        );
        setArticleTotal(count);
        await loadConnections();

        if (count > 0) {
          const newsRes = await api.news.getAll({ page: 1, limit: ITEMS_PER_PAGE });
          let rows = newsRes?.data || [];
          if (!rows.length) {
            const live = await api.news.getFeed(ITEMS_PER_PAGE);
            rows = live?.data || res.data?.preview || [];
          }
          applyArticles(rows);
        } else {
          const live = await api.news.getFeed(ITEMS_PER_PAGE);
          if (live?.success) applyArticles(live.data || []);
        }
        setPage(1);
      } else {
        setNewsNotice(res?.error || 'Sync failed.');
      }
    } catch (e) {
      setNewsNotice(e.error || 'Could not sync news. Run npm run dev:all and check UI-main/.env');
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (didAutoSync.current || articleTotal === null || articleTotal > 0) return;
    if (!connections) return;
    didAutoSync.current = true;
    handleSyncNews();
  }, [articleTotal, connections]);

  const handleAssetSelect = (e) => {
    const val = e.target.value;
    setSelectedAsset(val);
    setViewMode('asset');
    setPage(1);
    setSearchQuery('');
    setSearchParams(val ? { asset: val } : {}, { replace: true });
  };

  const handleModeSwitch = (mode) => {
    if (viewMode === mode) return;
    setViewMode(mode);
    setPage(1);
    if (mode === 'latest') {
      setSearchQuery('');
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ asset: selectedAsset }, { replace: true });
    }
  };

  const handleSearchChange = (e) => {
      setSearchQuery(e.target.value);
      setPage(1); 
  };

  const handleScroll = (e) => {
      const { scrollTop, clientHeight, scrollHeight } = e.target;
      if (scrollHeight - scrollTop <= clientHeight + 100) {
          if (!loading && !isFetchingMore && hasMore) {
              setPage(prev => prev + 1);
          }
      }
  };

  const getScoreColor = (val, type = 'text') => {
    if (typeof val === 'number') {
      if (val > 0.1) return type === 'text' ? 'text-emerald-500' : 'border-emerald-500 bg-emerald-500/10';
      if (val < -0.1) return type === 'text' ? 'text-red-500' : 'border-red-500 bg-red-500/10';
      return type === 'text' ? 'text-yellow-500' : 'border-yellow-500 bg-yellow-500/10';
    }
    if (val?.includes('bullish') || val?.includes('risk_on')) return type === 'text' ? 'text-emerald-500' : 'border-emerald-500 bg-emerald-500/10';
    if (val?.includes('bearish') || val?.includes('risk_off')) return type === 'text' ? 'text-red-500' : 'border-red-500 bg-red-500/10';
    return type === 'text' ? 'text-yellow-500' : 'border-yellow-500 bg-yellow-500/10';
  };

  // Helper to extract domain for Google Favicon API ---
  const getDomainLogo = (url, sourceName) => {
    let domain = null;
    if (url) {
      try {
        domain = new URL(url).hostname;
      } catch (e) {}
    }
    // Fallback mapping if URL is missing but source name is known
    if (!domain && sourceName) {
      const sourceMap = {
        'bloomberg': 'bloomberg.com',
        'reuters': 'reuters.com',
        'cnbc': 'cnbc.com',
        'wsj': 'wsj.com',
        'financial times': 'ft.com',
        'yahoo finance': 'finance.yahoo.com'
      };
      domain = sourceMap[sourceName.toLowerCase()] || null;
    }
    
    return domain 
      ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` 
      : null; // Returns null if we can't find a domain, so we can render a fallback
  };

  return (
    <div className="dash-page space-y-8 h-full flex flex-col">
      <PageHeader
        icon={Newspaper}
        title="Intelligence Feed"
        description="NewsAPI, NewsData, CoinDesk RSS, and CryptoPanic — server-side aggregation."
        action={
          <button
            type="button"
            onClick={handleSyncNews}
            disabled={syncing || loading}
            className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-2"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            Sync headlines
          </button>
        }
      />
      <p className="text-xs text-text-muted -mt-6">
        News and sentiment are informational only. See <Link to="/legal/risk">Risk Disclosure</Link>.
      </p>

      {connections && (
        <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
              API connections (from .env)
            </p>
            <span className="text-[10px] text-text-muted font-mono truncate max-w-md">
              {articleTotal != null ? `${articleTotal} articles in database` : ''}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'newsApi', label: 'NewsAPI' },
              { key: 'newsData', label: 'NewsData' },
              { key: 'coindesk', label: 'CoinDesk' },
              { key: 'cryptopanic', label: 'CryptoPanic' },
            ].map(({ key, label }) => {
              const row = connections[key];
              const ok = row?.status === 'ok' || row?.status === 'configured';
              const err = row?.status === 'error';
              const off = !row?.configured && row?.status === 'not_configured';
              const Icon = ok ? CheckCircle2 : err ? AlertCircle : CircleDashed;
              const tone = ok
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : err
                  ? 'border-red-500/30 bg-red-500/10 text-red-400'
                  : off
                    ? 'border-border text-text-muted'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-300';
              return (
                <div
                  key={key}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${tone}`}
                  title={row?.message || row?.note || ''}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                  <span className="opacity-80">{row?.status?.replace('_', ' ')}</span>
                </div>
              );
            })}
          </div>
          {connections.cryptopanic?.message && (
            <p className="text-xs text-amber-400/90">{connections.cryptopanic.message}</p>
          )}
          {connections.newsData?.message && connections.newsData.status === 'error' && (
            <p className="text-xs text-amber-400/90">NewsData: {connections.newsData.message}</p>
          )}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3 items-center rounded-xl border border-border/60 bg-surface p-3">
           <div className="flex items-center bg-background rounded-md p-1 border border-border">
              <button onClick={() => handleModeSwitch('latest')} className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-all ${viewMode === 'latest' ? 'bg-primary text-white shadow' : 'text-text-muted hover:text-text-main'}`}><Globe size={12}/> GLOBAL</button>
              <button onClick={() => handleModeSwitch('asset')} className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-all ${viewMode === 'asset' ? 'bg-surface-hover text-primary shadow' : 'text-text-muted hover:text-text-main'}`}><Filter size={12}/> ASSET</button>
           </div>
           <div className="w-px h-6 bg-border hidden md:block"></div>
           {viewMode === 'asset' && (
             <DashSelect
               label="Asset"
               value={selectedAsset}
               onChange={handleAssetSelect}
               wrapperClassName="w-full md:w-44"
               options={assetList.map((a) => ({
                 value: a.asset || a,
                 label: a.asset || a,
               }))}
             />
           )}
           <div className="flex-1 w-full relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"/>
              <input type="text" placeholder={viewMode === 'asset' ? `Search inside ${selectedAsset}...` : "Search global news..."} value={searchQuery} onChange={handleSearchChange} className="w-full bg-background border border-border focus:border-primary text-text-main text-sm py-1.5 pl-9 pr-4 rounded outline-none transition-colors" />
           </div>
        </div>
      {newsNotice && (
        <div className="text-xs text-text-muted bg-background/60 border border-border rounded px-3 py-2">
          {newsNotice}
        </div>
      )}

      {viewMode === 'asset' && !searchQuery && (
         <div className="bg-surface border border-border rounded-lg p-5 flex flex-col md:flex-row gap-6 relative overflow-hidden animate-fade-in">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
            
            <div className="flex flex-col items-center justify-center min-w-[120px] text-center border-r border-border pr-6">
               <span className="text-xs text-text-muted uppercase tracking-wider mb-1">Sentiment score</span>
               <div className={`text-4xl font-bold font-mono ${sentimentData ? getScoreColor(sentimentData.score ?? sentimentData.sentiment_score) : 'text-yellow-500'}`}>
                 {sentimentData && (sentimentData.score ?? sentimentData.sentiment_score) != null 
                   ? `${(sentimentData.score ?? sentimentData.sentiment_score) > 0 ? '+' : ''}${Number(sentimentData.score ?? sentimentData.sentiment_score).toFixed(4)}`
                   : 'N/A'}
               </div>
               <span className={`px-2 py-0.5 rounded text-[10px] font-bold mt-2 uppercase ${sentimentData ? getScoreColor(sentimentData.sentiment, 'bg') : 'bg-yellow-500/10 border-yellow-500 text-yellow-500'}`}>
                 {sentimentData?.sentiment || "Neutral"}
               </span>
            </div>

            <div className="flex-1">
               <h3 className="text-primary text-sm font-bold mb-2 flex items-center gap-2">
                 <Activity size={14} /> AI Analysis Summary
               </h3>
               <p className="text-sm text-text-muted leading-relaxed">
                 {sentimentData?.rationale || "Sentiment data requires more news volume for analysis."}
               </p>
            </div>
         </div>
      )}

      <div className="flex-1 min-h-0 bg-surface border border-border rounded-lg flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center bg-background/50 shadow-sm z-10">
          <h2 className="font-bold text-sm text-text-main flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" /> {searchQuery ? `Search Results: "${searchQuery}"` : viewMode === 'latest' ? 'Global Headlines' : `${selectedAsset} Stream`}
          </h2>
          <div className="flex items-center gap-2">
            {(loading || isFetchingMore) && <RefreshCw size={14} className="animate-spin text-text-muted" />}
            <span className="text-[10px] text-text-muted font-mono">{newsFeed.length} Articles</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent" onScroll={handleScroll}>
           {loading && page === 1 ? (
             <div className="p-12 text-center text-text-muted flex flex-col items-center"><RefreshCw size={24} className="animate-spin mb-2 opacity-50"/><span className="text-sm">Fetching intelligence...</span></div>
           ) : newsFeed.length === 0 ? (
             <div className="p-12 text-center text-text-muted text-sm">No articles found. Try adjusting your search or filter.</div>
           ) : (
             <div className="divide-y divide-border pb-4">
               {newsFeed?.map((item, idx) => {
                 const title = item.title;
                 const summary = item.description || item.summary;
                 const timeStr = item.publishedAt || item.time || Date.now();
                 const source = item.source || 'Aggregator';
                 const url = item.url;
                 const score = item.sentiment_score ?? item.score;
                 const relatedAssets = item.symbols || item.assets || [];
                 
                 // Fallback to "US" if countryCode isn't provided by your API yet, 
                 // or use the base currency of the selected asset if viewing by asset
                 const fallbackCountry = viewMode === 'asset' ? selectedAsset.substring(0, 2).toLowerCase() : 'us';
                 const countryCode = (item.countryCode || fallbackCountry).toLowerCase();
                 const logoUrl = getDomainLogo(url, source);

                 return (
                   <div key={`${idx}-${timeStr}`} className="p-4 hover:bg-surface-hover transition-colors group">
                     <div className="flex justify-between items-start gap-3">
                       <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                             
                             {/* Flags & Favicons integrated into the Source badge */}
                             <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-background border border-border shadow-sm">
                               {/* Country Flag */}
                               <img 
                                 src={`https://flagcdn.com/w20/${countryCode === 'eu' ? 'eu' : countryCode}.png`} 
                                 alt={countryCode}
                                 className="w-3.5 h-2.5 rounded-[1px] object-cover"
                                 onError={(e) => { e.target.style.display = 'none'; }} 
                               />
                               
                               {/* Outlet Favicon */}
                               {logoUrl ? (
                                 <img src={logoUrl} alt={source} className="w-3.5 h-3.5 rounded-sm" />
                               ) : (
                                 <Newspaper size={12} className="text-text-muted" />
                               )}
                               
                               {/* Source Name */}
                               <span className="text-[10px] font-bold text-text-main uppercase tracking-tight">
                                 {source}
                               </span>
                             </div>

                             <span className="text-[10px] text-text-muted flex items-center gap-1 ml-2">
                               <Clock size={10} /> {new Date(timeStr).toLocaleTimeString()} {new Date(timeStr).toLocaleDateString()}
                             </span>
                          </div>
                          
                          <h3 className="text-sm font-medium text-text-main group-hover:text-primary transition-colors leading-snug mt-1.5">{title}</h3>
                          {relatedAssets.length > 0 && viewMode === 'latest' && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {relatedAssets.slice(0, 4).map((sym) => (
                                <Link
                                  key={sym}
                                  to={`/dashboard/news?asset=${encodeURIComponent(sym)}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border border-primary/30 text-primary hover:bg-primary/10"
                                >
                                  {sym}
                                </Link>
                              ))}
                            </div>
                          )}
                          {summary && <p className="text-xs text-text-muted mt-1 line-clamp-2 max-w-3xl">{summary}</p>}
                          
                          <div className="mt-2 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                             {url && (<a href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline">READ FULL SOURCE <ArrowRight size={10}/></a>)}
                          </div>
                       </div>
                       
                       {score !== undefined && score !== null && (
                          <div className={`flex flex-col items-end min-w-[60px] text-right mt-1`}>
                            <span className={`text-xs font-mono font-bold px-2 py-1 border rounded ${getScoreColor(score, 'bg')}`}>
                              {score > 0 ? '+' : ''}{Number(score).toFixed(4)}
                            </span>
                          </div>
                       )}
                     </div>
                   </div>
                 );
               })}
               {isFetchingMore && (<div className="p-6 text-center text-text-muted flex flex-col items-center"><RefreshCw size={16} className="animate-spin mb-2 opacity-50"/><span className="text-xs">Loading more...</span></div>)}
               {!hasMore && newsFeed.length > 0 && (<div className="p-6 text-center text-[10px] text-text-muted uppercase tracking-widest font-bold opacity-50">End of Feed</div>)}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default News;
