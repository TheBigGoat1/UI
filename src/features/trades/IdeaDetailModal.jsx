import React, { useEffect, useState } from "react";
import { X, Activity, BarChart2, TrendingUp, CheckCircle, AlertCircle, Maximize2 } from "lucide-react";
import { api } from "../../services/api/api.js";
import TradeChart from "../../components/TradeChart";

const IdeaDetailModal = ({ isOpen, onClose, idea }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // -- FILTERS STATE --
  const [interval, setInterval] = useState("4h");
  const [period, setPeriod] = useState("1M");

  // -- TRADE EXECUTION STATE --
  const [tradeStatus, setTradeStatus] = useState("idle"); 
  const [activeTradeId, setActiveTradeId] = useState(null);
  const [tradeError, setTradeError] = useState(null);

  // Initialize trade state when the modal opens
  useEffect(() => {
    if (idea) {
      setTradeError(null);
      if (idea.trade_id) {
        setActiveTradeId(idea.trade_id);
        setTradeStatus('active');
      } else {
        setActiveTradeId(null);
        setTradeStatus('idle');
      }
    }
  }, [idea]);

  // Fetch History when filters change
  useEffect(() => {
    if (!isOpen || !idea?.asset) return;

    let active = true;
    setLoading(true);
    setChartData([]);

    const fetchData = async () => {
      try {
        const res = await api.market.getHistory(idea.asset, interval, period);
        if (active && res.success && Array.isArray(res.data)) {
          const normalized = res.data.map(d => ({
            ...d,
            time: d.time > 10000000000 ? d.time / 1000 : d.time 
          }));
          setChartData(normalized);
        }
      } catch (error) {
        console.error("Failed to load chart data", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    return () => { active = false; };
  }, [isOpen, idea, interval, period]);

  if (!isOpen || !idea) return null;

  const isLong = (idea.direction || "").toUpperCase().includes("LONG");
  const badgeClass = isLong 
    ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" 
    : "bg-red-500/10 border-red-500 text-red-500";
  
  const levels = [
    { price: idea.entry_price, type: 'ENTRY', label: 'Entry' },
    { price: idea.take_profit, type: 'SUPPORT', label: 'Target' }, 
    { price: idea.stop_loss, type: 'RESISTANCE', label: 'Stop' }
  ];

  // --- TRADE ACTION HANDLER ---
  const handleTradeAction = async () => {
    setTradeError(null);
    setTradeStatus('loading');
    try {
      if (!activeTradeId) {
        // ACCEPTING A NEW TRADE
        const res = await api.trades.accept(idea.id, 1);
        
        if (res.success && res.data) {
          setActiveTradeId(res.data.id); 
          setTradeStatus('active');
        } else if (res.status === 409) {
          setTradeError("This trade is already active in your portfolio.");
          setTradeStatus('active');
        } else {
          throw new Error(res.error || "Failed to accept trade");
        }
      } else {
        // CLOSING AN ACTIVE TRADE
        const currentPrice = chartData.length > 0 
          ? chartData[chartData.length - 1].close 
          : idea.entry_price;

        // Pass the current price to the backend
        const res = await api.trades.close(activeTradeId, currentPrice);
        
        if (res.success) {
          setTradeStatus('closed');
        } else {
          throw new Error(res.error || "Failed to close trade");
        }
      }
    } catch (err) {
      setTradeError(err.message);
      setTradeStatus(activeTradeId ? 'active' : 'idle');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f111a] border border-border w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl flex flex-col">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b border-border bg-surface/50 sticky top-0 backdrop-blur-md z-10">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-text-main">{idea.asset}</h2>
              <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded border ${badgeClass}`}>
                {idea.direction}
              </span>
            </div>
            <div className="text-xs text-text-muted mt-1">
              AI Confidence: <span className={idea.confidence > 70 ? "text-primary font-bold" : "text-text-main"}>{idea.confidence}%</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-full transition-colors text-text-muted hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-6 space-y-6">
          
          {/* CHART CONTAINER */}
          <div className="w-full bg-surface/30 rounded-lg border border-border/50 relative overflow-hidden flex flex-col">
             <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-surface/50">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase text-text-muted font-bold tracking-wider">Interval</span>
                    <select value={interval} onChange={(e) => setInterval(e.target.value)} className="bg-black/20 border border-border/50 rounded px-2 py-1 text-xs text-text-main focus:outline-none focus:border-primary/50 cursor-pointer hover:bg-black/40 transition-colors">
                      <option value="15m">15 Min</option>
                      <option value="1h">1 Hour</option>
                      <option value="4h">4 Hours</option>
                      <option value="1day">1 Day</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase text-text-muted font-bold tracking-wider">Period</span>
                    <select value={period} onChange={(e) => setPeriod(e.target.value)} className="bg-black/20 border border-border/50 rounded px-2 py-1 text-xs text-text-main focus:outline-none focus:border-primary/50 cursor-pointer hover:bg-black/40 transition-colors">
                      <option value="1W">1 Week</option>
                      <option value="1M">1 Month</option>
                      <option value="3M">3 Months</option>
                      <option value="1Y">1 Year</option>
                    </select>
                  </div>
                </div>
                <button className="text-text-muted hover:text-white transition-colors">
                   <Maximize2 size={14} />
                </button>
             </div>

             <div className="h-[350px] relative">
                {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-muted">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs">Loading {interval} Data...</span>
                    </div>
                ) : chartData.length > 0 ? (
                    <TradeChart data={chartData} levels={levels} height={350} interactive={true} />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">
                      <AlertCircle className="mr-2" size={16}/> Price data unavailable
                    </div>
                )}
             </div>
          </div>

          {/* ANALYSIS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="p-5 rounded-lg bg-surface border border-border flex flex-col justify-between h-full">
                <div>
                   <div className="flex items-center gap-2 mb-3">
                      <Activity size={14} className="text-blue-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Fundamental</span>
                   </div>
                   <div className="text-xl font-bold text-text-main mb-4">NEUTRAL</div>
                </div>
                <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
                   <div className="h-full bg-blue-500 w-1/3 rounded-full"></div>
                </div>
             </div>

             <div className="p-5 rounded-lg bg-surface border border-border flex flex-col justify-between h-full">
                <div>
                   <div className="flex items-center gap-2 mb-3">
                      <BarChart2 size={14} className="text-purple-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500">Technical</span>
                   </div>
                   <div className="text-xl font-bold text-text-main mb-4">BULLISH</div>
                </div>
                <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
                   <div className="h-full bg-purple-500 w-3/4 rounded-full"></div>
                </div>
             </div>

             <div className="p-5 rounded-lg bg-surface border border-border flex flex-col justify-between h-full">
                <div>
                   <div className="flex items-center gap-2 mb-3">
                      <TrendingUp size={14} className="text-orange-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500">Sentiment</span>
                   </div>
                   <div className="text-xl font-bold text-text-main mb-4">MIXED</div>
                </div>
                <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
                   <div className="h-full bg-orange-500 w-1/2 rounded-full"></div>
                </div>
             </div>
          </div>

          <div className="p-5 rounded-lg bg-surface border border-border">
             <h3 className="text-sm font-bold text-text-main mb-2">AI Rationale</h3>
             <p className="text-sm text-text-muted leading-relaxed">
               {idea.rationale || "No detailed rationale provided for this trade setup."}
             </p>
          </div>
        </div>

        {/* DYNAMIC FOOTER ACTIONS */}
        <div className="p-6 border-t border-border bg-surface/50 mt-auto flex justify-between items-center sticky bottom-0 backdrop-blur-md">
           <div className="text-red-500 text-sm font-medium flex items-center gap-2">
             {tradeError && <><AlertCircle size={16}/> {tradeError}</>}
           </div>
           
           <div className="flex gap-3">
             <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-text-muted hover:text-white transition-colors">
               Dismiss
             </button>
             <button 
               onClick={handleTradeAction}
               disabled={tradeStatus === 'loading' || tradeStatus === 'closed'}
               className={`px-6 py-2 text-white text-sm font-bold rounded flex items-center gap-2 transition-colors shadow-lg ${
                 tradeStatus === 'active' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 
                 tradeStatus === 'closed' ? 'bg-surface border border-border text-text-muted opacity-70 cursor-not-allowed' : 
                 'bg-primary hover:bg-blue-600 shadow-primary/20'
               }`}
             >
               {tradeStatus === 'loading' ? 'Processing...' :
                tradeStatus === 'active' ? <><X size={16}/> Close Trade</> :
                tradeStatus === 'closed' ? <><CheckCircle size={16}/> Trade Closed</> :
                <><CheckCircle size={16}/> Accept Trade</>}
             </button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default IdeaDetailModal;