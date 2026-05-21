import React, { useState, useEffect } from 'react';
import { api } from '../services/api/api.js';
import PageHeader from '../components/layout/PageHeader';
import { History, PlayCircle, TrendingUp, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

const Backtest = () => {
  const getThirtyDaysAgo = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  };
  const getToday = () => new Date().toISOString().split('T')[0];

  // UI State
  const [dates, setDates] = useState({ start: getThirtyDaysAgo(), end: getToday() });
  const [config, setConfig] = useState({ asset: 'EURUSD', interval: '4h', minConfidence: 40 });
  const [riskReward, setRiskReward] = useState(2.0);
  
  // Data State
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [assetList, setAssetList] = useState([]);

  // Fetch available assets for the dropdown
  useEffect(() => {
    api.market.getAssetsList().then(res => {
      if (res.success && Array.isArray(res.data)) setAssetList(res.data);
    });
  }, []);

  const handleRunBacktest = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      // EXACT PAYLOAD MATCHING POSTMAN
      const payload = {
        assets: [config.asset],
        start_date: dates.start,
        end_date: dates.end,
        interval: config.interval,
        min_confidence: Number(config.minConfidence)
      };

      const response = await api.ideas.runBacktest(payload);
      
      if (response.success && response.data) {
        setResults(response.data);
      } else {
        setError(response.error || 'Simulation failed to run. Check backend logs.');
      }
    } catch (err) {
      setError('Backend unreachable or threw an unexpected error.');
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (data) => {
    if (!data) return { wins: 0, losses: 0, winRatePct: 0, expectancy: 0, profitFactor: 0 };
    
    const wins = data.correct || 0;
    const total = data.total || 0;
    const losses = total - wins;
    const winRate = total > 0 ? (wins / total) : 0;
    
    const winRatePct = data.accuracy || Math.round(winRate * 100); 
    const expectancy = (winRate * riskReward) - ((1 - winRate) * 1);
    const profitFactor = losses > 0 ? (wins * riskReward) / (losses * 1) : (wins > 0 ? 99 : 0);

    return { wins, losses, winRatePct, expectancy, profitFactor };
  };

  const metrics = calculateMetrics(results);
  const totalTrades = results?.total || 0;

  return (
    <div className="dash-page space-y-8 max-w-5xl mx-auto">
      <PageHeader
        icon={History}
        title="Strategy Backtester"
        description="Simulate signal performance on historical data to validate your edge."
      />

      {/* Control Panel */}
      <div className="bg-surface border border-border rounded-lg p-6 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-xs text-text-muted mb-1 font-bold uppercase tracking-wider">Asset</label>
            <select 
              value={config.asset} onChange={(e) => setConfig({...config, asset: e.target.value})}
              className="w-full bg-background border border-border rounded px-3 py-2 text-text-main focus:border-primary outline-none"
            >
              {assetList.length > 0 
                ? assetList.map(a => <option key={a.asset || a} value={a.asset || a}>{a.asset || a}</option>)
                : <option value="EURUSD">EURUSD</option>}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1 font-bold uppercase tracking-wider">Timeframe</label>
            <select 
              value={config.interval} onChange={(e) => setConfig({...config, interval: e.target.value})}
              className="w-full bg-background border border-border rounded px-3 py-2 text-text-main focus:border-primary outline-none"
            >
              <option value="15m">15 Min</option>
              <option value="1h">1 Hour</option>
              <option value="4h">4 Hours</option>
              <option value="1day">1 Day</option>
            </select>
          </div>
          <div>
             <label className="block text-xs text-text-muted mb-1 font-bold uppercase tracking-wider">Min Confidence</label>
             <input 
               type="number" min="0" max="100" value={config.minConfidence} onChange={(e) => setConfig({...config, minConfidence: e.target.value})}
               className="w-full bg-background border border-border rounded px-3 py-2 text-text-main focus:border-primary outline-none"
             />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end border-t border-border/50 pt-6">
          <div>
            <label className="block text-xs text-text-muted mb-1 font-bold uppercase tracking-wider">Start Date</label>
            <input type="date" value={dates.start} onChange={(e) => setDates({...dates, start: e.target.value})} className="w-full bg-background border border-border rounded px-3 py-2 text-text-main cursor-pointer" />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1 font-bold uppercase tracking-wider">End Date</label>
            <input type="date" value={dates.end} onChange={(e) => setDates({...dates, end: e.target.value})} className="w-full bg-background border border-border rounded px-3 py-2 text-text-main cursor-pointer" />
          </div>
          <div>
             <label className="block text-xs text-text-muted mb-1 font-bold uppercase tracking-wider">Target R:R Ratio</label>
             <select value={riskReward} onChange={(e) => setRiskReward(Number(e.target.value))} className="w-full bg-background border border-border rounded px-3 py-2 text-text-main cursor-pointer">
               <option value="1">1:1 (Conservative)</option>
               <option value="1.5">1:1.5 (Balanced)</option>
               <option value="2">1:2 (Standard)</option>
               <option value="3">1:3 (Aggressive)</option>
             </select>
          </div>
          <button 
            onClick={handleRunBacktest} disabled={loading}
            className="bg-primary hover:bg-blue-600 text-white font-bold py-2.5 px-4 rounded flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <PlayCircle size={18} />}
            {loading ? 'Simulating...' : 'Run Simulation'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg flex items-center gap-3 animate-in fade-in">
          <AlertTriangle size={20} className="shrink-0" /> 
          <span className="font-medium">{error}</span>
        </div>
      )}

      {results && !loading && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface border border-border p-5 rounded-lg text-center hover:border-primary/30 transition-colors">
              <div className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-2">Total Trades</div>
              <div className="text-3xl font-bold text-text-main">{totalTrades}</div>
            </div>
            
            <div className="bg-surface border border-border p-5 rounded-lg text-center hover:border-primary/30 transition-colors">
              <div className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-2">Win Rate</div>
              <div className={`text-3xl font-bold ${metrics.winRatePct >= 50 ? 'text-emerald-500' : 'text-red-500'}`}>
                {metrics.winRatePct}%
              </div>
            </div>
            
            <div className="bg-surface border border-border p-5 rounded-lg text-center hover:border-primary/30 transition-colors">
              <div className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-2">Profit Factor</div>
              <div className={`text-3xl font-bold ${metrics.profitFactor > 1.5 ? 'text-emerald-500' : metrics.profitFactor > 1 ? 'text-yellow-500' : 'text-red-500'}`}>
                {metrics.profitFactor.toFixed(2)}
              </div>
            </div>
            
            <div className="bg-surface border border-border p-5 rounded-lg text-center hover:border-primary/30 transition-colors">
              <div className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-2">Expectancy (R)</div>
              <div className={`text-3xl font-bold ${metrics.expectancy > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {metrics.expectancy > 0 ? '+' : ''}{metrics.expectancy.toFixed(2)}R
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border p-6 rounded-lg">
            <h3 className="font-bold text-text-main mb-6 flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" /> Performance Distribution
            </h3>
            
            {totalTrades > 0 ? (
              <>
                <div className="flex h-10 w-full rounded-lg overflow-hidden bg-background border border-border/50">
                  <div style={{ width: `${metrics.winRatePct}%` }} className="bg-emerald-500 h-full transition-all duration-1000 ease-out relative group"></div>
                  <div style={{ width: `${100 - metrics.winRatePct}%` }} className="bg-red-500 h-full transition-all duration-1000 ease-out relative group"></div>
                </div>
                
                <div className="flex justify-between mt-4 text-sm font-bold">
                  <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded">
                    <CheckCircle2 size={16} /> Wins: {metrics.wins}
                  </div>
                  <div className="flex items-center gap-2 text-red-500 bg-red-500/10 px-3 py-1.5 rounded">
                    <XCircle size={16} /> Losses: {metrics.losses}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-text-muted flex flex-col items-center">
                 <AlertTriangle size={32} className="mb-2 opacity-50" />
                 <p>No trades taken during this period.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Backtest;
