import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import AddTradeModal from '../components/journal/AddTradeModal';
import TradeChart from '../components/TradeChart';
import { api } from '../services/api/api.js';
import { systemStorage } from '../services/tradingSystem/storage';
import { DEFAULT_CHART } from '../utils/chartConfig.js';
import WeeklyDebriefPanel from '../components/brief/WeeklyDebriefPanel';
import {
  BookOpen, Plus, Search, RefreshCw, Download, Link as LinkIcon,
  ArrowUpRight, ArrowDownRight, Brain, Calendar as CalendarIcon,
  BarChart2, LayoutDashboard, TrendingUp, Target,
} from 'lucide-react';

const OverviewTab = ({ trades, metrics }) => {
  const sorted = [...trades].sort(
    (a, b) => new Date(a.entryDate || 0) - new Date(b.entryDate || 0),
  );
  let equity = 0;
  const curve = sorted.map((t) => {
    equity += parseFloat(t.pnl) || 0;
    return { equity, date: t.entryDate };
  });
  const maxEquity = Math.max(...curve.map((c) => c.equity), 0);
  const minEquity = Math.min(...curve.map((c) => c.equity), 0);
  const range = maxEquity - minEquity || 1;

  return (
    <div className="space-y-6">
      <WeeklyDebriefPanel />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="dash-stat p-4">
          <p className="dash-stat__label">Net P&L</p>
          <p className={`dash-stat__value text-xl ${metrics.totalPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            ${Math.abs(metrics.totalPnl).toFixed(2)}
          </p>
        </div>
        <div className="dash-stat p-4">
          <p className="dash-stat__label">Win rate</p>
          <p className="dash-stat__value text-xl">{metrics.winRate.toFixed(1)}%</p>
        </div>
        <div className="dash-stat p-4">
          <p className="dash-stat__label">Profit factor</p>
          <p className="dash-stat__value text-xl text-primary">{metrics.profitFactor.toFixed(2)}</p>
        </div>
        <div className="dash-stat p-4">
          <p className="dash-stat__label">Trades</p>
          <p className="dash-stat__value text-xl">{metrics.totalTrades}</p>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">Equity curve</h3>
        {curve.length < 2 ? (
          <p className="text-sm text-text-muted">Log trades to build your equity curve.</p>
        ) : (
          <div className="dash-equity-chart">
            {curve.map((point, i) => (
              <div
                key={i}
                className="flex-1 bg-primary/80 rounded-t-sm min-w-[6px] hover:bg-primary transition-colors"
                style={{ height: `${Math.max(8, ((point.equity - minEquity) / range) * 100)}%` }}
                title={`$${point.equity.toFixed(2)}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const AnalyticsTab = ({ trades, metrics }) => {
  const symbol = useMemo(() => {
    if (!trades.length) return 'EURUSD';
    const counts = {};
    trades.forEach((t) => {
      const a = t.asset || 'EURUSD';
      counts[a] = (counts[a] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }, [trades]);

  const losses = trades.filter((t) => parseFloat(t.pnl) < 0);
  const maxLoss = losses.length ? Math.min(...losses.map((t) => parseFloat(t.pnl))) : 0;
  const wins = trades.filter((t) => parseFloat(t.pnl) > 0);
  const avgWin = wins.length ? wins.reduce((s, t) => s + parseFloat(t.pnl), 0) / wins.length : 0;
  const avgLoss = losses.length
    ? losses.reduce((s, t) => s + parseFloat(t.pnl), 0) / losses.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider">
          Market context · {symbol}
        </h3>
        <span className="text-[10px] text-text-muted font-mono">
          Same {DEFAULT_CHART.period} / {DEFAULT_CHART.interval} as Overview
        </span>
      </div>

      <div className="dash-journal-chart">
        <TradeChart
          symbol={symbol}
          interval={DEFAULT_CHART.interval}
          height={320}
          interactive
          className="h-full min-h-[300px]"
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border p-4 bg-background/30">
          <p className="text-[10px] text-text-muted uppercase font-bold mb-1">Max loss</p>
          <p className="text-xl font-mono font-bold text-red-400">${Math.abs(maxLoss).toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-border p-4 bg-background/30">
          <p className="text-[10px] text-text-muted uppercase font-bold mb-1">Avg win</p>
          <p className="text-xl font-mono font-bold text-emerald-500">+${avgWin.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-border p-4 bg-background/30">
          <p className="text-[10px] text-text-muted uppercase font-bold mb-1">Avg loss</p>
          <p className="text-xl font-mono font-bold text-red-400">${avgLoss.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-border p-4 bg-background/30">
          <p className="text-[10px] text-text-muted uppercase font-bold mb-1">Profit factor</p>
          <p className="text-xl font-mono font-bold text-primary">{metrics.profitFactor.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
};

const CalendarTab = ({ trades }) => {
  const byDay = {};
  trades.forEach((t) => {
    const d = t.entryDate ? new Date(t.entryDate).toDateString() : 'Unknown';
    if (!byDay[d]) byDay[d] = { pnl: 0, count: 0, wins: 0 };
    byDay[d].pnl += parseFloat(t.pnl) || 0;
    byDay[d].count += 1;
    if (parseFloat(t.pnl) > 0) byDay[d].wins += 1;
  });
  const days = Object.entries(byDay).slice(-35);

  return (
    <div>
      <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">
        Daily P&L heatmap
      </h3>
      {days.length === 0 ? (
        <p className="text-sm text-text-muted">No daily distribution yet.</p>
      ) : (
        <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
          {days.map(([day, stats]) => (
            <div
              key={day}
              className={`rounded-lg border p-2 text-center min-h-[64px] flex flex-col justify-center ${
                stats.pnl >= 0
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : 'border-red-500/30 bg-red-500/10'
              }`}
              title={day}
            >
              <div className="text-[9px] text-text-muted truncate">{day.split(' ').slice(0, 2).join(' ')}</div>
              <div className="font-bold text-sm">{stats.count}</div>
              <div className="font-mono text-[10px]">
                {stats.pnl >= 0 ? '+' : ''}{stats.pnl.toFixed(0)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Journal = () => {
  const [activeTab, setActiveTab] = useState('journal');
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [metrics, setMetrics] = useState({
    totalPnl: 0, winRate: 0, profitFactor: 0, totalTrades: 0,
  });

  const loadTrades = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.journal.getTrades();
      if (response?.success && Array.isArray(response.data)) {
        setTrades(response.data);
        return;
      }
    } catch {
      const localTrades = systemStorage.getJournalTrades();
      setTrades(Array.isArray(localTrades) ? localTrades : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTrades(); }, [loadTrades]);

  useEffect(() => {
    if (!trades.length) {
      setMetrics({ totalPnl: 0, winRate: 0, profitFactor: 0, totalTrades: 0 });
      return;
    }
    const totalTrades = trades.length;
    const wins = trades.filter((t) => t.status?.toUpperCase() === 'WIN' || parseFloat(t.pnl) > 0).length;
    const totalPnl = trades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0);
    const grossProfit = trades.reduce((sum, t) => (parseFloat(t.pnl) > 0 ? sum + parseFloat(t.pnl) : sum), 0);
    const grossLoss = Math.abs(trades.reduce((sum, t) => (parseFloat(t.pnl) < 0 ? sum + parseFloat(t.pnl) : sum), 0));
    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 99.99 : 0) : grossProfit / grossLoss;
    setMetrics({ totalTrades, winRate: (wins / totalTrades) * 100, totalPnl, profitFactor });
  }, [trades]);

  const handleSaveTrade = async (payload) => {
    setSaving(true);
    try {
      const res = await api.journal.createTrade(payload);
      if (res?.success) {
        setShowAddModal(false);
        await loadTrades();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'WIN': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'LOSS': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-surface-hover text-text-muted border-border';
    }
  };

  const filteredTrades = trades.filter((trade) =>
    trade.asset?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trade.strategy?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="dash-page flex flex-col space-y-8">
      <PageHeader
        icon={BookOpen}
        title="Trading Journal"
        description="Log setups, analyze performance, and align psychology with outcomes."
        action={
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <button type="button" onClick={loadTrades} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-bold text-text-muted hover:text-text-main">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <Link to="/dashboard/connections" className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-bold text-text-muted hover:text-primary">
              <LinkIcon size={16} /> Sync broker
            </Link>
            <button type="button" onClick={() => setShowAddModal(true)} className="btn-primary py-2 px-4 text-sm">
              <Plus size={16} /> Add trade
            </button>
          </div>
        }
      />

      <div className="dash-stat-grid">
        <div className="dash-stat">
          <p className="dash-stat__label"><Target size={12} /> Net P&L</p>
          <p className={`dash-stat__value ${metrics.totalPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {metrics.totalPnl >= 0 ? '+' : '-'}${Math.abs(metrics.totalPnl).toFixed(2)}
          </p>
        </div>
        <div className="dash-stat">
          <p className="dash-stat__label"><TrendingUp size={12} /> Win rate</p>
          <p className="dash-stat__value">{metrics.winRate.toFixed(1)}%</p>
        </div>
        <div className="dash-stat">
          <p className="dash-stat__label">Profit factor</p>
          <p className="dash-stat__value text-primary">{metrics.profitFactor.toFixed(2)}</p>
        </div>
        <div className="dash-stat">
          <p className="dash-stat__label">Total trades</p>
          <p className="dash-stat__value">{metrics.totalTrades}</p>
        </div>
      </div>

      <div className="dash-panel flex flex-col min-h-[480px]">
        <div className="flex border-b border-border px-2 pt-2 bg-background/50 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'journal', label: 'Journal', icon: BookOpen },
            { id: 'analytics', label: 'Analytics', icon: BarChart2 },
            { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-main'
                }`}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          {activeTab === 'overview' && <div className="p-6"><OverviewTab trades={trades} metrics={metrics} /></div>}
          {activeTab === 'analytics' && <div className="p-6"><AnalyticsTab trades={trades} metrics={metrics} /></div>}
          {activeTab === 'calendar' && <div className="p-6"><CalendarTab trades={trades} /></div>}

          {activeTab === 'journal' && (
            <>
              <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search asset, strategy…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg py-2 pl-9 pr-4 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-text-muted uppercase bg-background border-b border-border sticky top-0">
                    <tr>
                      <th className="px-4 py-3 font-bold">Asset</th>
                      <th className="px-4 py-3 font-bold">Date</th>
                      <th className="px-4 py-3 font-bold">Strategy</th>
                      <th className="px-4 py-3 font-bold">Psychology</th>
                      <th className="px-4 py-3 font-bold text-right">P&L</th>
                      <th className="px-4 py-3 font-bold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-text-muted">
                          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-primary" />
                          Loading journal…
                        </td>
                      </tr>
                    ) : filteredTrades.length ? (
                      filteredTrades.map((trade) => (
                        <tr key={trade.id} className="hover:bg-background/40">
                          <td className="px-4 py-3 font-bold">
                            {trade.asset}
                            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${trade.type === 'LONG' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                              {trade.type === 'LONG' ? <ArrowUpRight size={10} className="inline" /> : <ArrowDownRight size={10} className="inline" />}
                              {trade.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-text-muted font-mono text-xs">
                            {trade.entryDate ? new Date(trade.entryDate).toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-3">{trade.strategy || '—'}</td>
                          <td className="px-4 py-3 text-xs">
                            {trade.emotion && <span className="flex items-center gap-1"><Brain size={12} />{trade.emotion}</span>}
                          </td>
                          <td className={`px-4 py-3 text-right font-mono font-bold ${parseFloat(trade.pnl) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {parseFloat(trade.pnl) >= 0 ? '+' : ''}${Math.abs(parseFloat(trade.pnl || 0)).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold border ${getStatusColor(trade.status)}`}>
                              {trade.status || '—'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-text-muted">
                          {searchTerm ? 'No matches.' : 'No trades yet. Add one or sync from Connections.'}
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

      <AddTradeModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveTrade}
        saving={saving}
      />
    </div>
  );
};

export default Journal;
