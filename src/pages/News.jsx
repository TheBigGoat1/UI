import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api/api.js';
import { Newspaper, RefreshCw, ArrowRight, TrendingUp, Activity, Globe, Clock, Filter, Search, ChevronRight } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';

const News = () => {
  const [viewMode, setViewMode] = useState('latest'); 
  const [selectedAsset, setSelectedAsset] = useState('EURUSD');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [assetList, setAssetList] = useState([]);
  const [sentimentData, setSentimentData] = useState(null);
  
  const [newsFeed, setNewsFeed] = useState([]);
  const [loading, setLoading] = useState(false); 
  const [isFetchingMore, setIsFetchingMore] = useState(false); 
  const [hasMore, setHasMore] = useState(true); 
  
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    api.market.getAssetsList().then(res => {
      if (res.success && Array.isArray(res.data)) {
        setAssetList(res.data);
      }
    });
  }, []);

  const fetchData = async () => {
    if (page === 1) {
        setLoading(true);
        setNewsFeed([]); 
    } else {
        setIsFetchingMore(true);
    }
    
    try {
      let newsRes;

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
        if (page === 1) setNewsFeed([]);
        setHasMore(false);
      } else {
        const rawData = newsRes?.data ? newsRes.data : newsRes;
        let dataArray = [];

        if (Array.isArray(rawData)) {
            dataArray = rawData;
        } else if (typeof rawData === 'object' && rawData !== null) {
            dataArray = Object.values(rawData).filter(item => item && typeof item === 'object' && item.title);
        }

        if (page === 1) {
            setNewsFeed(dataArray);
        } else {
            setNewsFeed(prev => [...prev, ...dataArray]);
        }
        
        setHasMore(dataArray.length >= ITEMS_PER_PAGE);
      }

    } catch (e) {
      console.error("Data fetch failed", e);
      if (page === 1) setNewsFeed([]);
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [viewMode, selectedAsset, page, searchQuery]);

  const handleAssetSelect = (e) => {
    setSelectedAsset(e.target.value);
    setViewMode('asset');
    setPage(1);
    setSearchQuery(''); 
  };

  const handleModeSwitch = (mode) => {
    if (viewMode === mode) return;
    setViewMode(mode);
    setPage(1);
    if (mode === 'latest') setSearchQuery('');
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
        description="Real-time news aggregation and sentiment analysis."
      />

      <div className="flex flex-col md:flex-row gap-3 items-center rounded-xl border border-border/60 bg-surface p-3">
           <div className="flex items-center bg-background rounded-md p-1 border border-border">
              <button onClick={() => handleModeSwitch('latest')} className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-all ${viewMode === 'latest' ? 'bg-primary text-white shadow' : 'text-text-muted hover:text-text-main'}`}><Globe size={12}/> GLOBAL</button>
              <button onClick={() => handleModeSwitch('asset')} className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-all ${viewMode === 'asset' ? 'bg-surface-hover text-primary shadow' : 'text-text-muted hover:text-text-main'}`}><Filter size={12}/> ASSET</button>
           </div>
           <div className="w-px h-6 bg-border hidden md:block"></div>
           {viewMode === 'asset' && (
             <div className="relative">
                <select value={selectedAsset} onChange={handleAssetSelect} className="appearance-none bg-background border border-border hover:border-primary text-text-main text-xs font-bold py-2 pl-3 pr-8 rounded outline-none cursor-pointer w-full md:w-40 transition-colors">
                  {assetList.map(a => (<option key={a.asset || a} value={a.asset || a}>{a.asset || a}</option>))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted"><ChevronRight size={12} className="rotate-90" /></div>
             </div>
           )}
           <div className="flex-1 w-full relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"/>
              <input type="text" placeholder={viewMode === 'asset' ? `Search inside ${selectedAsset}...` : "Search global news..."} value={searchQuery} onChange={handleSearchChange} className="w-full bg-background border border-border focus:border-primary text-text-main text-sm py-1.5 pl-9 pr-4 rounded outline-none transition-colors" />
           </div>
        </div>

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
