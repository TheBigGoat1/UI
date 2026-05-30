import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../services/api/api.js';
import { friendlyApiError } from '../utils/friendlyApiError.js';
import { runClientBacktest, isRecoverableBacktestError } from '../utils/clientBacktest.js';
import { useEntitlements } from '../hooks/useEntitlements.js';
import { useAuth } from '../context/AuthContext.jsx';
import UpgradeGate from '../components/billing/UpgradeGate.jsx';
import PageHeader from '../components/layout/PageHeader';
import DashSelect from '../components/ui/DashSelect.jsx';
import { History, PlayCircle, TrendingUp, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Lock, Download } from 'lucide-react';
import { buildBacktestCsv, downloadCsv } from '../utils/exportCsv.js';

const Backtest = () => {
  const location = useLocation();
  const preset = location.state?.preset;
  const { refreshUser } = useAuth();
  const { canRunBacktest, isAuthenticated } = useEntitlements();
  const isDev = import.meta.env.DEV;

  const getThirtyDaysAgo = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  };
  const getToday = () => new Date().toISOString().split('T')[0];

  const [dates, setDates] = useState({ start: getThirtyDaysAgo(), end: getToday() });
  const [config, setConfig] = useState({ asset: 'BTCUSD', interval: '4h', minConfidence: 40 });
  const [riskReward, setRiskReward] = useState(2.0);

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [upgradeNotice, setUpgradeNotice] = useState('');
  const [devTrialLoading, setDevTrialLoading] = useState(false);
  const [assetList, setAssetList] = useState([]);

  useEffect(() => {
    api.market.getAssetsList().then((res) => {
      if (res?.success && Array.isArray(res.data)) setAssetList(res.data);
    }).catch(() => {
      setAssetList([]);
    });
  }, []);

  useEffect(() => {
    if (!preset) return;
    setConfig((c) => ({
      ...c,
      asset: preset.symbol || c.asset,
      interval: preset.interval || c.interval,
      minConfidence: preset.minConfidence ?? c.minConfidence,
    }));
    if (preset.minRR) setRiskReward(preset.minRR);
  }, [preset]);

  const handleRunBacktest = async () => {
    if (!isAuthenticated) {
      setError('Sign in to run backtests.');
      return;
    }

    if (!canRunBacktest) {
      setUpgradeNotice(
        'Backtesting requires Pro or Elite. Start a 7-day trial on Plans — or use dev trial below when testing locally.',
      );
      setError(null);
      return;
    }

    if (new Date(dates.start) > new Date(dates.end)) {
      setError('Start date must be before end date.');
      return;
    }

    setLoading(true);
    setError(null);
    setNotice('');
    setUpgradeNotice('');
    setResults(null);

    const payload = {
      assets: [config.asset],
      start_date: dates.start,
      end_date: dates.end,
      interval: config.interval,
      min_confidence: Number(config.minConfidence),
      risk_reward: Number(riskReward),
    };

    try {
      const response = await api.backtest.run(payload);

      if (response?.success && response.data) {
        setResults(response.data);
        setError(null);
        if (response.data.dataSource === 'synthetic') {
          setNotice(
            response.data.message ||
              'Ran on model OHLC (live feed rate-limited). Crypto pairs use Binance for best live history.',
          );
        }
        return;
      }

      const apiErr = response?.error || response;
      if (response?.status === 401 || /sign in|unauthorized/i.test(String(apiErr))) {
        setError('Sign in to run backtests.');
        return;
      }

      if (isRecoverableBacktestError(apiErr) && canRunBacktest) {
        const fallback = runClientBacktest({
          asset: config.asset,
          start_date: dates.start,
          end_date: dates.end,
          interval: config.interval,
          min_confidence: Number(config.minConfidence),
          risk_reward: Number(riskReward),
        });
        setResults(fallback);
        setError(null);
        setNotice(friendlyApiError(apiErr));
        return;
      }

      setError(friendlyApiError(apiErr || 'Simulation failed to run.'));
    } catch (err) {
      if (err?.code === 'capability_required') {
        setUpgradeNotice(
          'Backtesting requires Pro or Elite. In development, sign in and use Settings → billing dev trial, or upgrade on Pricing.',
        );
        setError(null);
      } else if (err?.status === 401) {
        setError('Sign in to run backtests.');
      } else if (isRecoverableBacktestError(err) && canRunBacktest) {
        const fallback = runClientBacktest({
          asset: config.asset,
          start_date: dates.start,
          end_date: dates.end,
          interval: config.interval,
          min_confidence: Number(config.minConfidence),
          risk_reward: Number(riskReward),
        });
        setResults(fallback);
        setError(null);
        setNotice(friendlyApiError(err));
      } else {
        setError(friendlyApiError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const startDevTrial = async () => {
    setDevTrialLoading(true);
    setUpgradeNotice('');
    try {
      const res = await api.billing.startDevTrial({ plan: 'pro', billingCycle: 'monthly' });
      if (res?.success) {
        await refreshUser();
        setUpgradeNotice('Pro trial started — you can run backtests now.');
      } else {
        setUpgradeNotice(res?.error || 'Dev trial failed.');
      }
    } catch (err) {
      setUpgradeNotice(err?.error || 'Dev trial failed.');
    } finally {
      setDevTrialLoading(false);
    }
  };

  const calculateMetrics = (data) => {
    if (!data) return { wins: 0, losses: 0, winRatePct: 0, expectancy: 0, profitFactor: 0 };

    const wins = data.correct || 0;
    const total = data.total || 0;
    const losses = total - wins;
    const winRate = total > 0 ? wins / total : 0;
    const winRatePct = data.accuracy ?? Math.round(winRate * 100);
    const expectancy = Number(data.expectancy ?? winRate * riskReward - (1 - winRate));
    const profitFactor = Number(
      data.profitFactor ?? (losses > 0 ? (wins * riskReward) / losses : wins > 0 ? 99 : 0),
    );

    return { wins, losses, winRatePct, expectancy, profitFactor };
  };

  const metrics = calculateMetrics(results);
  const totalTrades = results?.total || 0;

  const exportResultsCsv = () => {
    if (!results) return;
    const rows = buildBacktestCsv({ results, config, dates, riskReward, metrics });
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`insidr-backtest-${config.asset}-${stamp}.csv`, rows);
  };

  return (
    <div className="dash-page space-y-8 max-w-5xl mx-auto">
      <PageHeader
        icon={History}
        title="Strategy Backtester"
        description="Walk-forward simulation on historical OHLC using the same technical engine as live ideas (HTF/LTF bias + confidence filter)."
      />

      {!canRunBacktest && isAuthenticated && (
        <UpgradeGate
          feature="backtest.run"
          showDevTrial={isDev}
          onDevTrial={startDevTrial}
          devTrialLoading={devTrialLoading}
        />
      )}

      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-text-muted">
        <strong className="text-text-main">Tip:</strong> Crypto pairs (BTCUSD, ETHUSD) use Binance history for
        best results. Forex/commodities may use Yahoo/Twelve or synthetic fallback when APIs are rate-limited.
      </div>

      <div className="dash-panel">
        <div className="dash-panel__body space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DashSelect
              label="Asset"
              value={config.asset}
              onChange={(e) => setConfig({ ...config, asset: e.target.value })}
              options={
                assetList.length > 0
                  ? assetList.map((a) => ({ value: a.asset || a, label: a.asset || a }))
                  : [
                      { value: 'BTCUSD', label: 'BTCUSD' },
                      { value: 'EURUSD', label: 'EURUSD' },
                    ]
              }
            />
            <DashSelect
              label="Timeframe"
              value={config.interval}
              onChange={(e) => setConfig({ ...config, interval: e.target.value })}
              options={[
                { value: '15m', label: '15 Min' },
                { value: '1h', label: '1 Hour' },
                { value: '4h', label: '4 Hours' },
                { value: '1day', label: '1 Day' },
              ]}
            />
            <div className="dash-field">
              <label className="dash-field__label">Min confidence</label>
              <input
                type="number"
                min="0"
                max="100"
                value={config.minConfidence}
                onChange={(e) => setConfig({ ...config, minConfidence: e.target.value })}
                className="dash-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end border-t border-border/50 pt-6">
            <div className="dash-field">
              <label className="dash-field__label">Start date</label>
              <input
                type="date"
                value={dates.start}
                onChange={(e) => setDates({ ...dates, start: e.target.value })}
                className="dash-input"
              />
            </div>
            <div className="dash-field">
              <label className="dash-field__label">End date</label>
              <input
                type="date"
                value={dates.end}
                onChange={(e) => setDates({ ...dates, end: e.target.value })}
                className="dash-input"
              />
            </div>
            <DashSelect
              label="Target R:R"
              value={String(riskReward)}
              onChange={(e) => setRiskReward(Number(e.target.value))}
              options={[
                { value: '1', label: '1:1 Conservative' },
                { value: '1.5', label: '1:1.5 Balanced' },
                { value: '2', label: '1:2 Standard' },
                { value: '3', label: '1:3 Aggressive' },
              ]}
            />
            <button
              type="button"
              onClick={handleRunBacktest}
              disabled={loading || (!canRunBacktest && isAuthenticated)}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : !canRunBacktest && isAuthenticated ? (
                <Lock size={18} />
              ) : (
                <PlayCircle size={18} />
              )}
              {loading
                ? 'Simulating…'
                : !canRunBacktest && isAuthenticated
                  ? 'Pro required'
                  : 'Run simulation'}
            </button>
          </div>
        </div>
      </div>

      {notice && !error && (
        <div className="bg-amber-500/10 border border-amber-500/25 text-amber-200/90 p-4 rounded-lg text-sm flex items-start gap-3">
          <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-400" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg flex items-center gap-3">
          <AlertTriangle size={20} className="shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}
      {upgradeNotice && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 p-4 rounded-lg space-y-2">
          <p>{upgradeNotice}</p>
          <Link to="/dashboard/pricing" className="text-primary text-sm font-bold hover:underline">
            View plans →
          </Link>
        </div>
      )}

      {results && !loading && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-muted">
              {results.dataSource && (
                <span className="font-semibold text-text-main capitalize">{results.dataSource}</span>
              )}{' '}
              simulation · {totalTrades} signal{totalTrades === 1 ? '' : 's'}
            </p>
            <button
              type="button"
              onClick={exportResultsCsv}
              className="px-4 py-2 rounded-lg border border-border hover:bg-surface-hover text-sm font-semibold flex items-center gap-2"
            >
              <Download size={15} /> Export CSV
            </button>
          </div>

          {(results.message || results.total === 0) && (
            <div className="bg-amber-500/10 border border-amber-500/25 text-amber-200/90 p-4 rounded-lg text-sm">
              {results.message ||
                'No trades matched your filters. Try lowering min confidence, widening dates, or switching to BTCUSD/ETHUSD.'}
              {results.barsUsed != null && (
                <span className="block text-xs text-text-muted mt-1">
                  Bars: {results.barsUsed}
                  {results.dataSource && ` · Source: ${results.dataSource}`}
                  {results.signalsEvaluated != null &&
                    ` · Signals scanned: ${results.signalsEvaluated}`}
                  {results.assetClass && ` · Class: ${results.assetClass}`}
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="dash-stat p-4 text-center">
              <div className="dash-stat__label">Total trades</div>
              <div className="dash-stat__value text-2xl">{totalTrades}</div>
            </div>
            <div className="dash-stat p-4 text-center">
              <div className="dash-stat__label">Win rate</div>
              <div
                className={`text-2xl font-bold ${metrics.winRatePct >= 50 ? 'text-emerald-500' : 'text-red-500'}`}
              >
                {metrics.winRatePct}%
              </div>
            </div>
            <div className="dash-stat p-4 text-center">
              <div className="dash-stat__label">Profit factor</div>
              <div
                className={`text-2xl font-bold ${metrics.profitFactor > 1.5 ? 'text-emerald-500' : metrics.profitFactor > 1 ? 'text-yellow-500' : 'text-red-500'}`}
              >
                {metrics.profitFactor.toFixed(2)}
              </div>
            </div>
            <div className="dash-stat p-4 text-center">
              <div className="dash-stat__label">Expectancy (R)</div>
              <div
                className={`text-2xl font-bold ${metrics.expectancy > 0 ? 'text-emerald-500' : 'text-red-500'}`}
              >
                {metrics.expectancy > 0 ? '+' : ''}
                {metrics.expectancy.toFixed(2)}R
              </div>
            </div>
            <div className="dash-stat p-4 text-center">
              <div className="dash-stat__label">Max drawdown (R)</div>
              <div className="text-2xl font-bold text-text-main">
                {results.maxDrawdownR != null ? `${results.maxDrawdownR}R` : '—'}
              </div>
            </div>
          </div>

          <div className="dash-panel">
            <div className="dash-panel__head">
              <h3 className="dash-panel__title">
                <TrendingUp size={18} className="text-primary" /> Performance distribution
              </h3>
            </div>
            <div className="dash-panel__body">
              {totalTrades > 0 ? (
                <>
                  <div className="flex h-10 w-full rounded-lg overflow-hidden bg-background border border-border/50">
                    <div style={{ width: `${metrics.winRatePct}%` }} className="bg-emerald-500 h-full" />
                    <div
                      style={{ width: `${100 - metrics.winRatePct}%` }}
                      className="bg-red-500 h-full"
                    />
                  </div>
                  <div className="flex justify-between mt-4 text-sm font-bold">
                    <span className="text-emerald-500 flex items-center gap-2">
                      <CheckCircle2 size={16} /> Wins: {metrics.wins}
                    </span>
                    <span className="text-red-500 flex items-center gap-2">
                      <XCircle size={16} /> Losses: {metrics.losses}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-center text-text-muted py-6">
                  No trades in this period at your confidence threshold.
                </p>
              )}
            </div>
          </div>

          {Array.isArray(results.trades) && results.trades.length > 0 && (
            <div className="dash-panel overflow-hidden">
              <div className="dash-panel__head">
                <h3 className="dash-panel__title">Signal log</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-text-muted border-b border-border">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Bias</th>
                      <th className="px-4 py-3">Conf.</th>
                      <th className="px-4 py-3">Entry</th>
                      <th className="px-4 py-3">Exit</th>
                      <th className="px-4 py-3">Move %</th>
                      <th className="px-4 py-3">R</th>
                      <th className="px-4 py-3">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...results.trades].reverse().map((t, i) => (
                      <tr key={`${t.date}-${i}`} className="border-b border-border/40">
                        <td className="px-4 py-2.5 text-text-muted">{t.date}</td>
                        <td className="px-4 py-2.5 capitalize">{t.bias}</td>
                        <td className="px-4 py-2.5">{t.confidence}%</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{t.entry}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{t.exit}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-text-muted">
                          {t.movePct != null ? `${t.movePct > 0 ? '+' : ''}${t.movePct}%` : '—'}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs">{t.rMultiple}R</td>
                        <td
                          className={`px-4 py-2.5 font-bold capitalize ${t.result === 'win' ? 'text-emerald-500' : 'text-red-500'}`}
                        >
                          {t.result}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Backtest;
