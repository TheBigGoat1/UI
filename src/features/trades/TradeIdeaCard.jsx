import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { api } from "../../services/api/api.js"; 
import TradeChart from "../../components/TradeChart"; 

const TradeIdeaCard = ({ idea, onClick }) => {
  if (!idea) return null;

  const [chartData, setChartData] = useState([]);
  const [loadingChart, setLoadingChart] = useState(true);
  const [currentMarketPrice, setCurrentMarketPrice] = useState(null);

  // Fetch History for the Chart & Current Price
  useEffect(() => {
    let active = true;
    const fetchHistory = async () => {
      const symbol = idea.asset || idea.symbol;
      if (!symbol) return;

      try {
        const res = await api.market.getHistory(symbol, '1h', '1W');
        if (active && res.success && Array.isArray(res.data)) {
          const cleanData = res.data.map(d => ({
            ...d,
            time: d.time > 10000000000 ? d.time / 1000 : d.time,
            close: Number(d.close) // Ensure close is a number
          }));
          
          const recent = cleanData.slice(-30);
          setChartData(recent); 
          
          // Use last known price as fallback Entry
          if (recent.length > 0) {
            setCurrentMarketPrice(recent[recent.length - 1].close);
          }
        }
      } catch (e) {
        console.error("Chart load failed", e);
      } finally {
        if (active) setLoadingChart(false);
      }
    };
    fetchHistory();
    return () => { active = false; };
  }, [idea]);

  // Data Mapping
  const asset = idea.asset || idea.symbol || "UNK";
  const direction = idea.direction || (idea.side ? idea.side.toUpperCase() : "FLAT");
  const confidence = idea.confidence || idea.winProbability || 0;
  const rationale = idea.rationale || idea.analysis || "Technical structure supports this setup.";
  
  // --- ENTRY PRICE ---
  const rawEntry = idea.entry_price ?? idea.entryPrice ?? idea.price ?? idea.suggested_entry;
  
  const resolvedEntry = (rawEntry !== undefined && rawEntry !== null && !isNaN(rawEntry)) 
    ? parseFloat(rawEntry) 
    : currentMarketPrice;

  // Formatting for display
  const entryDisplay = resolvedEntry ? resolvedEntry : "-";
  const target = idea.take_profit ?? idea.takeProfit ?? idea.target ?? "-";
  const stop = idea.stop_loss ?? idea.stopLoss ?? idea.stop ?? "-";
  
  const rawDate = idea.created_at ?? idea.createdAt ?? idea.timestamp ?? idea.date;
  const created = rawDate ? rawDate : new Date().toISOString(); 
  
  const confluence = idea.confluence_score || idea.confluenceScore;

  // Theme & Calculations
  const isLong = (direction.toUpperCase().includes("LONG") || direction.toUpperCase().includes("BUY"));
  const theme = isLong
    ? { border: "border-emerald-500/20", bg: "bg-emerald-500/5", badge: "bg-emerald-500/10 border-emerald-500 text-emerald-500" }
    : { border: "border-red-500/20", bg: "bg-red-500/5", badge: "bg-red-500/10 border-red-500 text-red-500" };

  const formatDate = (iso) => {
    try { 
        const date = new Date(iso);
        if (isNaN(date.getTime())) return "Just Now";
        return date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); 
    } catch { return "--:--"; }
  };

  const calculateRR = () => {
    const e = parseFloat(resolvedEntry);
    const t = parseFloat(target);
    const s = parseFloat(stop);

    if (isNaN(e) || isNaN(t) || isNaN(s)) return "N/A";
    
    let risk = 0, reward = 0;
    if (isLong) { 
        risk = e - s; 
        reward = t - e; 
    } else { 
        risk = s - e; 
        reward = e - t; 
    }

    if (risk <= 0.00001) return "N/A";
    
    return `1:${(reward / risk).toFixed(2)}`;
  };

  const displayNum = (val) => {
      const num = parseFloat(val);
      return isNaN(num) ? val : num.toFixed(5);
  };

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      className={`card-modern border ${theme.border} p-0 cursor-pointer group flex flex-col relative overflow-hidden h-full`}
    >
      <div className="signal-accent-top" />
      <div className="p-5 pb-2">
        {/* Confidence */}
        <div className="absolute top-0 right-0 p-4 text-right z-10">
          <div className="flex flex-col items-end">
            <span className={`text-2xl font-bold font-mono ${confidence > 80 ? "text-primary" : "text-text-muted"}`}>{confidence}%</span>
            <span className="text-[10px] uppercase text-text-muted font-bold tracking-wider">Confidence</span>
          </div>
        </div>

        {/* Header */}
        <div className="mb-4 pr-16">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-xl text-text-main">{asset}</span>
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${theme.badge}`}>{direction}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-text-muted mt-2">
            <Clock size={10} /> Created: {formatDate(created)}
          </div>
        </div>

        {/* CHART SPARKLINE */}
        <div className="h-24 w-full mb-4 border-b border-border/50 relative">
          {loadingChart ? (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-text-muted animate-pulse">Loading...</div>
          ) : (
            <TradeChart 
              data={chartData} 
              height={96} 
              interactive={false}
              levels={[]} 
            />
          )}
        </div>

        {/* Data Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-background/60 p-1.5 rounded-lg border border-border/80 text-center relative transition-all duration-300 hover:border-primary/30 hover:bg-surface-hover">
             <span className="text-[9px] text-text-muted uppercase block mb-0.5">Entry</span>
             <span className="font-mono font-bold text-xs text-text-main">
                {/* Shows a tiny tooltip if entry is inferred from market price */}
                {(!rawEntry && currentMarketPrice) && <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" title="Market Execution Price" />}
                {displayNum(entryDisplay)}
             </span>
          </div>
          <div className="bg-background/60 p-1.5 rounded-lg border border-border/80 text-center transition-all duration-300 hover:border-success/30 hover:bg-surface-hover">
             <span className="text-[9px] text-text-muted uppercase block mb-0.5">Target</span>
             <span className="font-mono font-bold text-xs text-emerald-500">{displayNum(target)}</span>
          </div>
          <div className="bg-background/60 p-1.5 rounded-lg border border-border/80 text-center transition-all duration-300 hover:border-danger/30 hover:bg-surface-hover">
             <span className="text-[9px] text-text-muted uppercase block mb-0.5">Stop Loss</span>
             <span className="font-mono font-bold text-xs text-red-500">{displayNum(stop)}</span>
          </div>
        </div>

        {/* Rationale */}
        <p className="text-xs text-text-muted line-clamp-2 leading-relaxed mb-2">
           <span className="font-bold text-text-main opacity-50 mr-1">Analysis:</span>{rationale}
        </p>
      </div>

      {/* Footer */}
      <div className={`mt-auto pt-2 border-t border-border flex justify-between items-center ${theme.bg} px-5 py-2`}>
        <div className="flex flex-col">
          <span className="text-[9px] text-text-muted uppercase">R:R</span>
          <span className="font-bold font-mono text-xs text-text-main">{calculateRR()}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[9px] text-text-muted uppercase">Confluence</span>
          <span className="font-bold text-xs text-primary">{confluence ? `${confluence}/10` : "High"}</span>
        </div>
      </div>
    </div>
  );
};

export default TradeIdeaCard;