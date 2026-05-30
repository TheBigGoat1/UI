import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import PlatformGuide from '../components/settings/PlatformGuide';
import DataFeedsPanel from '../components/settings/DataFeedsPanel';
import WatchlistPanel from '../components/settings/WatchlistPanel';
import AlertsPanel from '../components/settings/AlertsPanel.jsx';
import ActivityLog from '../components/settings/ActivityLog';
import { useAuth } from '../context/AuthContext.jsx';
import { useEntitlements } from '../hooks/useEntitlements.js';
import { api } from '../services/api/api.js';
import {
  Settings as SettingsIcon,
  Shield,
  Cpu,
  Save,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  CreditCard,
  Loader2,
  Info,
  BookOpen,
  Bell,
  User,
  Radio,
} from 'lucide-react';

const RISK_KEY = 'insidr_risk_settings';
const ENGINE_KEY = 'insidr_engine_modules';

const TABS = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'trading', label: 'Trading', icon: Cpu },
  { id: 'safety', label: 'Safety', icon: Shield },
  { id: 'data', label: 'Data & feeds', icon: Radio },
  { id: 'guide', label: 'Platform guide', icon: BookOpen },
  { id: 'activity', label: 'Activity', icon: Bell },
];

const defaultRisk = {
  accountSize: 10000,
  maxAccountRisk: 1.0,
  maxBookHeat: 3.0,
  dailyDrawdownLimit: 5.0,
  maxOpenPositions: 3,
  eventGateMinutes: 45,
};

const defaultEngine = {
  marketStructure: true,
  supportResistance: true,
  orderBlocks: true,
  pocLevels: true,
  psychologicalLevels: true,
  harmonics: true,
  liquidity: true,
  sma: true,
  fibonacci: true,
  rsiDivergence: true,
};

const VALID_TABS = ['account', 'trading', 'safety', 'data', 'guide', 'activity'];

const Settings = () => {
  const { user, refreshUser } = useAuth();
  const { paid, canGenerateIdeas, canRunBacktest, capabilities } = useEntitlements();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || 'account';
  const tab = VALID_TABS.includes(rawTab) ? rawTab : 'account';

  const setTab = (id) => {
    setSearchParams({ tab: id }, { replace: true });
  };

  const [portalLoading, setPortalLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [openCount, setOpenCount] = useState(0);
  const [flattenLoading, setFlattenLoading] = useState(false);
  const [flattenMsg, setFlattenMsg] = useState(null);
  const [riskSettings, setRiskSettings] = useState(defaultRisk);
  const [engineModules, setEngineModules] = useState(defaultEngine);
  const [alertPanelMsg, setAlertPanelMsg] = useState(null);
  const [devTrialLoading, setDevTrialLoading] = useState(null);
  const [billingMsg, setBillingMsg] = useState(null);
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    try {
      const r = localStorage.getItem(RISK_KEY);
      const e = localStorage.getItem(ENGINE_KEY);
      if (r) setRiskSettings({ ...defaultRisk, ...JSON.parse(r) });
      if (e) setEngineModules({ ...defaultEngine, ...JSON.parse(e) });
    } catch {
      /* ignore */
    }
    api.trader
      .getProfile()
      .then((res) => {
        if (!res?.success || !res.data) return;
        setRiskSettings((prev) => ({
          ...prev,
          accountSize: res.data.account_size ?? prev.accountSize,
          maxAccountRisk: res.data.risk_percent_per_trade ?? prev.maxAccountRisk,
          maxBookHeat: res.data.max_book_heat_percent ?? prev.maxBookHeat,
          maxOpenPositions: res.data.max_open_positions ?? prev.maxOpenPositions,
          eventGateMinutes: res.data.event_gate_minutes ?? prev.eventGateMinutes,
        }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    api.trades
      .getOpen()
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) setOpenCount(res.data.length);
      })
      .catch(() => setOpenCount(0));
  }, [flattenMsg]);

  const showAlertMessage = (text, isError = false) => {
    setAlertPanelMsg({ text, isError });
    setTimeout(() => setAlertPanelMsg(null), 4000);
  };

  const openBillingPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await api.billing.portal();
      if (res?.data?.url) window.location.href = res.data.url;
      else alert(res?.error || 'Could not open billing portal.');
    } catch (err) {
      const msg = err.error || 'Billing portal unavailable.';
      alert(
        msg.includes('No billing account') || msg.includes('Subscribe')
          ? 'No billing account yet. View plans to start a trial or subscription first.'
          : msg,
      );
    } finally {
      setPortalLoading(false);
    }
  };

  const startDevTrial = async (plan) => {
    setDevTrialLoading(plan);
    setBillingMsg(null);
    try {
      const res = await api.billing.startDevTrial({ plan, billingCycle: 'monthly' });
      if (res?.success) {
        await refreshUser();
        setBillingMsg(
          `${plan === 'elite' ? 'Elite' : 'Pro'} trial started — backtest and idea generation unlocked.`,
        );
      } else {
        setBillingMsg(res?.error || 'Dev trial failed.');
      }
    } catch (err) {
      setBillingMsg(err?.error || 'Dev trial failed.');
    } finally {
      setDevTrialLoading(null);
    }
  };

  const savePreferences = async () => {
    localStorage.setItem(RISK_KEY, JSON.stringify(riskSettings));
    localStorage.setItem(ENGINE_KEY, JSON.stringify(engineModules));
    try {
      await api.trader.saveProfile({
        account_size: riskSettings.accountSize,
        risk_percent_per_trade: riskSettings.maxAccountRisk,
        max_book_heat_percent: riskSettings.maxBookHeat,
        max_open_positions: riskSettings.maxOpenPositions,
        event_gate_minutes: riskSettings.eventGateMinutes,
      });
      setSaveMsg('Trading profile saved — book heat and size hints will use these values.');
    } catch {
      setSaveMsg('Saved locally — sign in to sync profile to the server.');
    }
    setTimeout(() => setSaveMsg(null), 4000);
  };

  const handleFlatten = async () => {
    if (openCount === 0) return;
    if (
      !window.confirm(
        `Close all ${openCount} open position(s) in Insidr at current market price? This does not affect external broker accounts.`,
      )
    ) {
      return;
    }
    setFlattenLoading(true);
    setFlattenMsg(null);
    try {
      const res = await api.trades.flattenAll();
      if (res?.success) {
        setFlattenMsg(res.data?.message || `Closed ${res.data?.closed || 0} position(s).`);
        setOpenCount(0);
      } else {
        setFlattenMsg(res?.error || 'Flatten failed.');
      }
    } catch (err) {
      setFlattenMsg(err.error || 'Could not reach API.');
    } finally {
      setFlattenLoading(false);
    }
  };

  const formatLabel = (key) => {
    const result = key.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
  };

  const Toggle = ({ active, onClick, label }) => (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-sm text-text-muted">{label}</span>
      <button
        type="button"
        onClick={onClick}
        className={`transition-colors ${active ? 'text-emerald-500' : 'text-text-muted hover:text-text-main'}`}
        aria-pressed={active}
      >
        {active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
      </button>
    </div>
  );

  return (
    <div className="dash-page max-w-5xl mx-auto space-y-6 pb-12">
      <PageHeader
        icon={SettingsIcon}
        title="Settings"
        description="Account, trading preferences, safety controls, platform guide, and activity log."
      />

      <nav className="dash-settings-tabs" aria-label="Settings sections">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`dash-settings-tab inline-flex items-center gap-2 ${
              tab === id ? 'dash-settings-tab--active' : ''
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      <div className="dash-panel">
        <div className="dash-panel__body">
          {tab === 'account' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <CreditCard className="text-primary shrink-0 mt-0.5" size={22} />
                  <div>
                    <h2 className="font-semibold text-text-main text-lg">Account & billing</h2>
                    <p className="text-sm text-text-muted capitalize mt-1">
                      {user?.email}
                      <br />
                      {user?.tier || 'free'} plan
                      {user?.subscription_status && user.subscription_status !== 'none'
                        ? ` · ${user.subscription_status}`
                        : ''}
                      {user?.trial_ends_at && user.subscription_status === 'trialing' && (
                        <>
                          <br />
                          <span className="text-xs">
                            Trial ends {new Date(user.trial_ends_at).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to="/dashboard/pricing" className="btn-ghost text-sm px-4 py-2">
                    View plans
                  </Link>
                  <button
                    type="button"
                    onClick={openBillingPortal}
                    disabled={portalLoading}
                    className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-2"
                  >
                    {portalLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                    Manage billing
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background/30 p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Your entitlements
                </p>
                <ul className="text-xs text-text-muted space-y-1">
                  <li>
                    Idea generation:{' '}
                    <span className={canGenerateIdeas ? 'text-emerald-400 font-bold' : 'text-amber-300'}>
                      {canGenerateIdeas ? 'Unlocked' : 'Pro required'}
                    </span>
                  </li>
                  <li>
                    Backtest lab:{' '}
                    <span className={canRunBacktest ? 'text-emerald-400 font-bold' : 'text-amber-300'}>
                      {canRunBacktest ? 'Unlocked' : 'Pro required'}
                    </span>
                  </li>
                  {paid && capabilities.length > 0 && (
                    <li className="text-[10px] pt-1 font-mono opacity-70">
                      {capabilities.join(' · ')}
                    </li>
                  )}
                </ul>
              </div>

              {billingMsg && (
                <p className="text-sm text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded-lg px-3 py-2">
                  {billingMsg}
                </p>
              )}

              {isDev && !paid && (
                <div className="rounded-xl border border-dashed border-primary/40 p-4 space-y-2">
                  <p className="text-xs font-bold text-primary">Local dev — trial without Stripe</p>
                  <p className="text-xs text-text-muted">
                    Unlocks Pro gates for backtest and idea generation. No card charge.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={devTrialLoading === 'pro'}
                      onClick={() => startDevTrial('pro')}
                      className="btn-ghost text-xs px-3 py-2 border border-border"
                    >
                      {devTrialLoading === 'pro' ? 'Starting…' : 'Start Pro trial'}
                    </button>
                    <button
                      type="button"
                      disabled={devTrialLoading === 'elite'}
                      onClick={() => startDevTrial('elite')}
                      className="btn-ghost text-xs px-3 py-2 border border-border"
                    >
                      {devTrialLoading === 'elite' ? 'Starting…' : 'Start Elite trial'}
                    </button>
                  </div>
                </div>
              )}

              <p className="text-sm text-text-muted border-t border-border pt-4">
                Use <strong className="text-text-main">Platform guide</strong> for workflows,
                what empty screens mean (Ideas, Economy, Backtest), and data-source health.
              </p>
            </div>
          )}

          {tab === 'trading' && (
            <div className="space-y-8">
              <WatchlistPanel />

              <section className="border-t border-border pt-8">
                <h2 className="font-semibold text-text-main flex items-center gap-2 mb-4">
                  <Shield size={18} className="text-emerald-500" />
                  Risk parameters
                </h2>
                <p className="text-xs text-text-muted mb-4">
                  Drives accept-flow size hints, book heat meter, and macro event gates — not broker orders.
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="dash-field__label">Account size ($)</label>
                    <input
                      type="number"
                      min={100}
                      value={riskSettings.accountSize}
                      onChange={(e) =>
                        setRiskSettings({ ...riskSettings, accountSize: Number(e.target.value) })
                      }
                      className="dash-input"
                    />
                  </div>
                  <div>
                    <label className="dash-field__label">Max risk per trade (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={riskSettings.maxAccountRisk}
                      onChange={(e) =>
                        setRiskSettings({ ...riskSettings, maxAccountRisk: Number(e.target.value) })
                      }
                      className="dash-input"
                    />
                  </div>
                  <div>
                    <label className="dash-field__label">Max book heat (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={riskSettings.maxBookHeat}
                      onChange={(e) =>
                        setRiskSettings({ ...riskSettings, maxBookHeat: Number(e.target.value) })
                      }
                      className="dash-input"
                    />
                  </div>
                  <div>
                    <label className="dash-field__label">Event gate (minutes)</label>
                    <input
                      type="number"
                      min={15}
                      max={120}
                      value={riskSettings.eventGateMinutes}
                      onChange={(e) =>
                        setRiskSettings({
                          ...riskSettings,
                          eventGateMinutes: Number(e.target.value),
                        })
                      }
                      className="dash-input"
                    />
                  </div>
                  <div>
                    <label className="dash-field__label">Daily drawdown (%)</label>
                    <input
                      type="number"
                      value={riskSettings.dailyDrawdownLimit}
                      onChange={(e) =>
                        setRiskSettings({
                          ...riskSettings,
                          dailyDrawdownLimit: Number(e.target.value),
                        })
                      }
                      className="dash-input"
                    />
                  </div>
                  <div>
                    <label className="dash-field__label">Max open positions</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={riskSettings.maxOpenPositions}
                      onChange={(e) =>
                        setRiskSettings({
                          ...riskSettings,
                          maxOpenPositions: Number(e.target.value),
                        })
                      }
                      className="dash-input"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="font-semibold text-text-main flex items-center gap-2 mb-2">
                  <Cpu size={18} className="text-purple-400" />
                  Analysis modules
                </h2>
                <p className="text-xs text-text-muted mb-3">
                  Toggle modules sent with chart analysis requests (saved locally). Disabled modules
                  are omitted from the technical payload and lower confidence accordingly.
                </p>
                <div className="max-w-xl">
                  {Object.entries(engineModules).map(([key, isActive]) => (
                    <Toggle
                      key={key}
                      label={formatLabel(key)}
                      active={isActive}
                      onClick={() => setEngineModules((prev) => ({ ...prev, [key]: !prev[key] }))}
                    />
                  ))}
                </div>
              </section>

              <section className="border-t border-border pt-8">
                <AlertsPanel onMessage={showAlertMessage} />
                {alertPanelMsg && (
                  <p
                    className={`text-sm mt-3 rounded-lg px-3 py-2 ${
                      alertPanelMsg.isError
                        ? 'text-red-400 border border-red-500/30 bg-red-500/10'
                        : 'text-emerald-400 border border-emerald-500/30 bg-emerald-500/10'
                    }`}
                  >
                    {alertPanelMsg.text}
                  </p>
                )}
              </section>

              <button
                type="button"
                onClick={savePreferences}
                className="btn-primary text-sm px-6 py-2.5 inline-flex items-center gap-2"
              >
                <Save size={16} /> Save trading preferences
              </button>
              {saveMsg && <p className="text-sm text-emerald-500">{saveMsg}</p>}
            </div>
          )}

          {tab === 'safety' && (
            <section
              className={`rounded-xl border p-5 ${
                openCount > 0 ? 'bg-red-500/5 border-red-500/30' : 'border-border'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div
                    className={`p-2 rounded-full shrink-0 ${
                      openCount > 0 ? 'bg-red-500/10' : 'bg-surface-hover'
                    }`}
                  >
                    <AlertTriangle
                      className={openCount > 0 ? 'text-red-500' : 'text-text-muted'}
                      size={22}
                    />
                  </div>
                  <div>
                    <h2 className="font-bold text-text-main text-lg">Emergency flatten</h2>
                    <p className="text-sm text-text-muted mt-2 leading-relaxed">
                      Closes every open position tracked in Insidr (from accepted ideas) at market
                      price and logs results in your journal. Does not affect your external broker.
                    </p>
                    <p className="text-xs text-text-muted mt-3 flex items-start gap-1.5">
                      <Info size={14} className="shrink-0 mt-0.5" />
                      {openCount > 0
                        ? `${openCount} open position(s) — flatten available.`
                        : 'No open positions. Accept an idea from Ideas to track exposure here.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleFlatten}
                  disabled={openCount === 0 || flattenLoading}
                  className="shrink-0 px-6 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white text-sm font-bold rounded-xl"
                >
                  {flattenLoading ? 'Closing…' : 'Flatten all positions'}
                </button>
              </div>
              {flattenMsg && (
                <p className="text-sm mt-4 pt-4 border-t border-border/50 text-text-main">
                  {flattenMsg}
                </p>
              )}
            </section>
          )}

          {tab === 'data' && <DataFeedsPanel />}

          {tab === 'guide' && <PlatformGuide />}

          {tab === 'activity' && <ActivityLog />}
        </div>
      </div>
    </div>
  );
};

export default Settings;
