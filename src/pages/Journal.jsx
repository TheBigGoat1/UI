import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import AddTradeModal from '../components/journal/AddTradeModal';
import ImportTradesModal from '../components/journal/ImportTradesModal';
import EquityCurve from '../components/journal/EquityCurve';
import TradeChart from '../components/TradeChart';
import { api } from '../services/api/api.js';
import { systemStorage } from '../services/tradingSystem/storage';
import { buildJournalCsv, downloadCsv } from '../utils/exportCsv.js';
import { DEFAULT_CHART } from '../utils/chartConfig.js';
import WeeklyDebriefPanel from '../components/brief/WeeklyDebriefPanel';
import {
  BookOpen, Plus, Search, RefreshCw, Download, Link as LinkIcon, FileUp,
  ArrowUpRight, ArrowDownRight, Brain, Calendar as CalendarIcon,
  BarChart2, LayoutDashboard, TrendingUp, Target,
} from 'lucide-react';

const OverviewTab = ({ trades, metrics }) => (
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
    <EquityCurve trades={trades} />
  </div>
);

const PsychologyBreakdown = ({ trades }) => {
  const tags = useMemo(() => {
    const map = {};
    trades.forEach((t) => {
      const key = t.emotion || 'Untagged';
      if (!map[key]) map[key] = { count: 0, wins: 0, pnl: 0 };
      map[key].count += 1;
      map[key].pnl += parseFloat(t.pnl) || 0;
      if (parseFloat(t.pnl) > 0 || t.status?.toUpperCase() === 'WIN') map[key].wins += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [trades]);

  if (!tags.length) {
    return (
      <p className="text-sm text-text-muted">
        Tag trades with mindset on accept/close to see psychology vs outcomes.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {tags.map(([label, stats]) => {
        const wr = stats.count ? (stats.wins / stats.count) * 100 : 0;
        return (
          <div
            key={label}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 bg-background/30"
          >
            <span className="text-xs font-bold text-text-main flex items-center gap-1.5">
              <Brain size={12} className="text-primary" /> {label}
            </span>
            <span className="text-[10px] text-text-muted font-mono">
              {stats.count} trades · {wr.toFixed(0)}% win ·{' '}
              <span className={stats.pnl >= 0 ? 'text-emerald-500' : 'text-red-400'}>
                {stats.pnl >= 0 ? '+' : ''}${stats.pnl.toFixed(0)}
              </span>
            </span>
          </div>
        );
      })}
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

      <div>
        <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">
          Psychology vs outcomes
        </h3>
        <PsychologyBreakdown trades={trades} />
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState(null);
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

  const handleExportCsv = () => {
    const rows = buildJournalCsv(trades);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`insidr-journal-${stamp}.csv`, rows);
  };

  const handleImportCsv = async (csv) => {
    setImporting(true);
    try {
      const res = await api.journal.importCsv(csv);
      if (res?.success) {
        const added = res.data?.inserted ?? 0;
        const skipped = res.data?.skipped ?? 0;
        setImportMsg(
          skipped > 0
            ? `Imported ${added} trade${added === 1 ? '' : 's'} (${skipped} duplicate${skipped === 1 ? '' : 's'} skipped).`
            : `Imported ${added} trade${added === 1 ? '' : 's'} into your journal.`,
        );
        await loadTrades();
        return { success: true };
      }
      return { success: false, error: res?.error || 'Import failed.' };
    } catch (err) {
      return { success: false, error: err?.error || 'Import failed.' };
    } finally {
      setImporting(false);
      setTimeout(() => setImportMsg(null), 5000);
    }
  };

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
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!trades.length}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-bold text-text-muted hover:text-text-main disabled:opacity-40"
            >
              <Download size={16} /> Export CSV
            </button>
            <button type="button" onClick={() => setShowImportModal(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-bold text-text-muted hover:text-text-main">
              <FileUp size={16} /> Import CSV
            </button>
            <button type="button" onClick={() => setShowAddModal(true)} className="btn-primary py-2 px-4 text-sm">
              <Plus size={16} /> Add trade
            </button>
          </div>
        }
      />

      {importMsg && (
        <p className="text-sm text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded-lg px-4 py-2">
          {importMsg}
        </p>
      )}

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

      <ImportTradesModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportCsv}
        importing={importing}
      />
    </div>
  );
};

export default Journal;
