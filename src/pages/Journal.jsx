import React, { useState, useEffect } from 'react';
import PageHeader from '../components/layout/PageHeader';
import { 
  BookOpen, Plus, Search, Filter, TrendingUp, Target, DollarSign,
  ArrowUpRight, ArrowDownRight, MoreHorizontal, RefreshCw,
  Download, Link as LinkIcon, FileText, Image as ImageIcon,
  AlertTriangle, Brain, Calendar as CalendarIcon, BarChart2,
  ChevronDown, LayoutDashboard
} from 'lucide-react';

// Sub-components for tabs (In a real app, you'd extract these to separate files)
const OverviewTab = () => <div className="p-8 text-center text-text-muted border border-border rounded-xl bg-surface/30 border-dashed">Overview Dashboard Construction (Equity Curve, Monthly P&L)</div>;
const AnalyticsTab = () => <div className="p-8 text-center text-text-muted border border-border rounded-xl bg-surface/30 border-dashed">Deep Analytics (Profit Factor, Drawdown, Mistake Matrix)</div>;
const CalendarTab = () => <div className="p-8 text-center text-text-muted border border-border rounded-xl bg-surface/30 border-dashed">Calendar Heatmap View (Daily Win/Loss Distribution)</div>;

const Journal = () => {
  const [activeTab, setActiveTab] = useState('journal');
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportMenu, setShowImportMenu] = useState(false);
  
  // Dynamic metrics state
  const [metrics, setMetrics] = useState({
    totalPnl: 0,
    winRate: 0,
    profitFactor: 0,
    totalTrades: 0
  });

  // Fetch trades skeleton
  useEffect(() => {
    const loadTrades = async () => {
      setLoading(true);
      try {
        // TODO: Replace with your actual API / Supabase fetch
        // const response = await api.journal.getTrades();
        // if (response.success) setTrades(response.data);
        
        // Simulating an empty database response
        setTrades([]); 
      } catch (error) {
        console.error("Failed to load trades:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTrades();
  }, []);

  // Reactive metrics calculation based on whatever is in the trades array
  useEffect(() => {
    if (trades.length === 0) {
      setMetrics({ totalPnl: 0, winRate: 0, profitFactor: 0, totalTrades: 0 });
      return;
    }

    const totalTrades = trades.length;
    const wins = trades.filter(t => t.status?.toUpperCase() === 'WIN').length;
    const totalPnl = trades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0);
    
    // Calculate Profit Factor (Gross Profit / Gross Loss)
    const grossProfit = trades.reduce((sum, t) => (parseFloat(t.pnl) > 0 ? sum + parseFloat(t.pnl) : sum), 0);
    const grossLoss = Math.abs(trades.reduce((sum, t) => (parseFloat(t.pnl) < 0 ? sum + parseFloat(t.pnl) : sum), 0));
    
    const profitFactor = grossLoss === 0 
      ? (grossProfit > 0 ? 99.99 : 0) // Handle infinite PF if no losses
      : (grossProfit / grossLoss);

    setMetrics({
      totalTrades,
      winRate: (wins / totalTrades) * 100,
      totalPnl,
      profitFactor
    });
  }, [trades]);

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'WIN': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'LOSS': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'BREAKEVEN': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-surface-hover text-text-muted border-border';
    }
  };

  const getEmotionColor = (emotion) => {
    const map = { 'Calm': 'text-blue-400', 'FOMO': 'text-orange-500', 'Anxious': 'text-purple-400', 'Overconfident': 'text-red-400' };
    return map[emotion] || 'text-text-muted';
  };

  const filteredTrades = trades.filter(trade => 
    trade.asset?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    trade.strategy?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dash-page flex flex-col h-full space-y-8">
      <PageHeader
        icon={BookOpen}
        title="Trading Journal"
        description="Log setups, track psychology, and analyze mistake costs."
        action={
          <div className="flex items-center gap-3 flex-wrap justify-end">
          <div className="relative">
            <button 
              onClick={() => setShowImportMenu(!showImportMenu)}
              className="flex items-center gap-2 bg-surface border border-border hover:bg-surface-hover text-text-main px-4 py-2 rounded-lg font-bold text-sm transition-colors"
            >
              <Download size={16} /> Sync / Import <ChevronDown size={14} />
            </button>
            
            {showImportMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                <div className="p-2 text-[10px] font-bold text-text-muted uppercase tracking-wider bg-background border-b border-border">Auto-Sync</div>
                <button className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-surface-hover flex items-center gap-3"><LinkIcon size={14} className="text-primary"/> MT4/MT5 (Via EA)</button>
                <button className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-surface-hover flex items-center gap-3"><LinkIcon size={14} className="text-primary"/> IBKR Flex API</button>
                <button className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-surface-hover flex items-center gap-3"><LinkIcon size={14} className="text-primary"/> Binance API</button>
                
                <div className="p-2 text-[10px] font-bold text-text-muted uppercase tracking-wider bg-background border-y border-border">Manual Import</div>
                <button className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-surface-hover flex items-center gap-3"><FileText size={14} className="text-text-muted"/> Upload CSV</button>
              </div>
            )}
          </div>
          
          <button type="button" className="btn-primary py-2 px-4 text-sm">
            <Plus size={16} /> Add Trade
          </button>
          </div>
        }
      />

      {/* Top Level Metrics (Global) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border p-4 rounded-xl">
          <p className="text-xs text-text-muted font-bold uppercase tracking-wider mb-1">Net P&L</p>
          <p className={`text-2xl font-mono font-bold ${metrics.totalPnl > 0 ? 'text-emerald-500' : metrics.totalPnl < 0 ? 'text-red-500' : 'text-text-main'}`}>
            {metrics.totalPnl > 0 ? '+' : ''}${Math.abs(metrics.totalPnl).toFixed(2)}
          </p>
        </div>
        <div className="bg-surface border border-border p-4 rounded-xl">
          <p className="text-xs text-text-muted font-bold uppercase tracking-wider mb-1">Win Rate</p>
          <p className="text-2xl font-mono font-bold text-text-main">{metrics.winRate.toFixed(1)}%</p>
        </div>
        <div className="bg-surface border border-border p-4 rounded-xl">
          <p className="text-xs text-text-muted font-bold uppercase tracking-wider mb-1">Profit Factor</p>
          <p className="text-2xl font-mono font-bold text-primary">{metrics.profitFactor.toFixed(2)}</p>
        </div>
        <div className="bg-surface border border-border p-4 rounded-xl">
          <p className="text-xs text-text-muted font-bold uppercase tracking-wider mb-1">Total Trades</p>
          <p className="text-2xl font-mono font-bold text-text-main">{metrics.totalTrades}</p>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-surface border border-border rounded-xl flex flex-col flex-1 min-h-0 overflow-hidden">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-border px-2 pt-2 bg-background/50">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'journal', label: 'Journal', icon: BookOpen },
            { id: 'analytics', label: 'Analytics', icon: BarChart2 },
            { id: 'calendar', label: 'Calendar', icon: CalendarIcon }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                  activeTab === tab.id 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-text-muted hover:text-text-main'
                }`}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Routing */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'overview' && <div className="p-6"><OverviewTab /></div>}
          {activeTab === 'analytics' && <div className="p-6"><AnalyticsTab /></div>}
          {activeTab === 'calendar' && <div className="p-6"><CalendarTab /></div>}
          
          {/* THE JOURNAL TABLE */}
          {activeTab === 'journal' && (
            <>
              {/* Toolbar */}
              <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative max-w-md w-full">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input 
                    type="text" 
                    placeholder="Search asset, strategy..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-background border border-border focus:border-primary text-text-main text-sm py-2 pl-9 pr-4 rounded-lg outline-none transition-colors"
                  />
                </div>
                <button className="flex items-center justify-center gap-2 px-4 py-2 bg-background border border-border rounded-lg text-sm font-bold text-text-muted hover:text-text-main hover:bg-surface-hover transition-colors">
                  <Filter size={16} /> Advanced Filters
                </button>
              </div>

              {/* Enhanced Ledger Table */}
              <div className="overflow-x-auto flex-1 custom-scrollbar">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="text-xs text-text-muted uppercase bg-background border-b border-border sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-4 font-bold">Asset / Type</th>
                      <th className="px-4 py-4 font-bold">Date (Local)</th>
                      <th className="px-4 py-4 font-bold">Strategy</th>
                      <th className="px-4 py-4 font-bold">Psychology</th>
                      <th className="px-4 py-4 font-bold text-right">Size</th>
                      <th className="px-4 py-4 font-bold text-right">R-Multi</th>
                      <th className="px-4 py-4 font-bold text-right">P&L</th>
                      <th className="px-4 py-4 font-bold text-center">Docs</th>
                      <th className="px-4 py-4 font-bold text-center">Status</th>
                      <th className="px-4 py-4 font-bold"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? (
                      <tr>
                        <td colSpan="10" className="px-6 py-12 text-center text-text-muted">
                          <RefreshCw size={24} className="animate-spin mx-auto mb-3 opacity-50 text-primary" />
                          <p>Loading journal entries...</p>
                        </td>
                      </tr>
                    ) : filteredTrades.length > 0 ? (
                      filteredTrades.map((trade) => (
                        <tr key={trade.id} className="hover:bg-background/50 transition-colors group">
                          
                          <td className="px-4 py-3">
                            <div className="font-bold text-text-main flex items-center gap-2">
                              {trade.asset}
                              <span className={`flex items-center text-[10px] px-1.5 py-0.5 rounded ${trade.type === 'LONG' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                {trade.type === 'LONG' ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>} {trade.type}
                              </span>
                            </div>
                          </td>
                          
                          <td className="px-4 py-3 text-text-muted font-mono text-xs">
                            {trade.entryDate ? new Date(trade.entryDate).toLocaleString([], {month: 'short', day: '2-digit', hour: '2-digit', minute:'2-digit'}) : '-'}
                          </td>
                          
                          <td className="px-4 py-3 font-medium">{trade.strategy || '-'}</td>
                          
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              {trade.emotion && (
                                <span className={`text-[10px] font-bold uppercase flex items-center gap-1 ${getEmotionColor(trade.emotion)}`}>
                                  <Brain size={12}/> {trade.emotion}
                                </span>
                              )}
                              {trade.mistakes && trade.mistakes.length > 0 && (
                                <span className="text-[10px] font-bold text-red-400 flex items-center gap-1" title={trade.mistakes.join(', ')}>
                                  <AlertTriangle size={12}/> {trade.mistakes.length} Mistake(s)
                                </span>
                              )}
                            </div>
                          </td>
                          
                          <td className="px-4 py-3 text-right font-mono text-text-main">{trade.size || '-'}</td>
                          
                          <td className={`px-4 py-3 text-right font-mono font-bold ${trade.rMultiple > 0 ? 'text-emerald-500' : trade.rMultiple < 0 ? 'text-red-500' : 'text-text-muted'}`}>
                            {trade.rMultiple ? `${trade.rMultiple > 0 ? '+' : ''}${trade.rMultiple.toFixed(2)}R` : '-'}
                          </td>
                          
                          <td className={`px-4 py-3 text-right font-mono font-bold ${trade.pnl > 0 ? 'text-emerald-500' : trade.pnl < 0 ? 'text-red-500' : 'text-text-muted'}`}>
                            {trade.pnl ? `${trade.pnl > 0 ? '+' : ''}$${Math.abs(trade.pnl).toFixed(2)}` : '-'}
                          </td>
                          
                          <td className="px-4 py-3 text-center">
                            {trade.hasScreenshot ? (
                              <ImageIcon size={16} className="text-primary mx-auto cursor-pointer hover:scale-110 transition-transform" />
                            ) : (
                              <span className="text-text-muted opacity-30">-</span>
                            )}
                          </td>
                          
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase border ${getStatusColor(trade.status)}`}>
                              {trade.status || 'PENDING'}
                            </span>
                          </td>
                          
                          <td className="px-4 py-3 text-right">
                            <button className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded transition-colors inline-flex opacity-0 group-hover:opacity-100">
                              <MoreHorizontal size={16} />
                            </button>
                          </td>
                          
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="10" className="px-6 py-12 text-center text-text-muted">
                          {searchTerm ? "No trades match your search criteria." : "No trades logged yet. Sync your broker or add one manually."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Journal;
