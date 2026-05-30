import React, { useEffect, useState } from 'react';
import { Bell, Loader2, Mail, Radio, Send, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api/api.js';
import { useEntitlements } from '../../hooks/useEntitlements.js';
import {
  isBrowserPushEnabled,
  isBrowserPushSupported,
  requestBrowserPushPermission,
} from '../../utils/browserNotify.js';

const RULE_LABELS = {
  watchlist_setup: {
    label: 'Watchlist setups',
    description: 'Notify when a scan finds a setup on one of your watchlist symbols.',
  },
  high_confidence_idea: {
    label: 'High confidence ideas',
    description: 'Notify on any symbol when confidence exceeds your threshold.',
  },
};

const Toggle = ({ active, onClick, label, disabled = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`text-xs font-bold px-2.5 py-1 rounded-md border transition-colors ${
      disabled
        ? 'border-border/50 text-text-muted/50 cursor-not-allowed'
        : active
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
          : 'border-border text-text-muted hover:text-text-main'
    }`}
    aria-pressed={active}
  >
    {label}
  </button>
);

const AlertsPanel = ({ onMessage }) => {
  const { hasCapability, paid } = useEntitlements();
  const canManage = hasCapability('alerts.manage');

  const [rules, setRules] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [pushReady, setPushReady] = useState(() => isBrowserPushEnabled());
  const [enablingPush, setEnablingPush] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [rulesRes, healthRes] = await Promise.all([
        canManage ? api.alerts.getRules() : Promise.resolve({ success: false }),
        api.alerts.health().catch(() => ({ success: false })),
      ]);
      if (rulesRes?.success) setRules(rulesRes.data || []);
      if (healthRes?.success) setHealth(healthRes.data);
    } catch {
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [canManage]);

  const updateRule = (ruleKey, patch) => {
    setRules((prev) =>
      prev.map((rule) => (rule.rule_key === ruleKey ? { ...rule, ...patch } : rule)),
    );
  };

  const saveRule = async (rule) => {
    setSavingKey(rule.rule_key);
    try {
      const res = await api.alerts.updateRule(rule.rule_key, {
        enabled: rule.enabled,
        threshold: rule.threshold,
        cooldown_sec: rule.cooldown_sec,
        channel_in_app: rule.channel_in_app,
        channel_email: rule.channel_email,
        channel_push: rule.channel_push,
      });
      if (res?.success) {
        onMessage?.('Alert rule saved.');
      } else {
        onMessage?.(res?.error || 'Could not save alert rule.', true);
      }
    } catch (err) {
      onMessage?.(err?.error || 'Could not save alert rule.', true);
    } finally {
      setSavingKey('');
    }
  };

  const sendTestEmail = async () => {
    setTestingEmail(true);
    try {
      const res = await api.alerts.testEmail();
      if (res?.success) {
        onMessage?.(`Test email sent to ${res.data?.to || 'your inbox'}.`);
      } else {
        onMessage?.(res?.error || 'Test email failed.', true);
      }
    } catch (err) {
      onMessage?.(err?.error || 'Test email failed.', true);
    } finally {
      setTestingEmail(false);
    }
  };

  const enableBrowserPush = async () => {
    if (!isBrowserPushSupported()) {
      onMessage?.('Browser notifications are not supported here.', true);
      return false;
    }
    setEnablingPush(true);
    try {
      const granted = await requestBrowserPushPermission();
      setPushReady(granted);
      if (granted) {
        onMessage?.('Browser notifications enabled — save each rule to persist push channel.');
      } else {
        onMessage?.('Notification permission was denied.', true);
      }
      return granted;
    } finally {
      setEnablingPush(false);
    }
  };

  const togglePushChannel = async (ruleKey, next) => {
    if (next && !pushReady) {
      const granted = await enableBrowserPush();
      if (!granted) return;
    }
    updateRule(ruleKey, { channel_push: next });
  };

  if (!canManage) {
    return (
      <section>
        <h2 className="font-semibold text-text-main flex items-center gap-2 mb-2">
          <Bell size={18} className="text-primary" />
          Alerts
        </h2>
        <div className="rounded-xl border border-border bg-background/30 p-4 text-sm text-text-muted">
          Email and advanced alert rules require{' '}
          <span className="text-text-main font-bold">Pro or Elite</span>. In-app notifications from
          idea scans still work on all plans.
          {!paid && (
            <>
              {' '}
              <Link to="/dashboard/pricing" className="text-primary font-bold hover:underline">
                View plans
              </Link>
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="font-semibold text-text-main flex items-center gap-2 mb-2">
        <Bell size={18} className="text-primary" />
        Alerts
      </h2>
      <p className="text-xs text-text-muted mb-4">
        Get notified when scans hit your watchlist or cross confidence thresholds. Enable email for
        off-session pings via Resend.
      </p>

      <div className="rounded-xl border border-border bg-background/30 p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2 text-xs text-text-muted">
          <Mail size={16} className="text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-text-main">Email channel</p>
            <p className="mt-1">
              {health?.email_configured ? (
                <span className="text-emerald-400">Resend configured</span>
              ) : (
                <span className="text-amber-300">Not configured — add RESEND_API_KEY to .env</span>
              )}
              {health?.from_email && (
                <span className="block font-mono text-[10px] mt-1 opacity-70">
                  From: {health.from_email}
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={sendTestEmail}
          disabled={testingEmail || !health?.email_configured}
          className="btn-ghost text-xs px-3 py-2 border border-border inline-flex items-center gap-2 disabled:opacity-40"
        >
          {testingEmail ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Send test email
        </button>
      </div>

      <div className="rounded-xl border border-border bg-background/30 p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2 text-xs text-text-muted">
          <Smartphone size={16} className="text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-text-main">Browser notifications</p>
            <p className="mt-1">
              {pushReady ? (
                <span className="text-emerald-400">Enabled — alerts ping when this tab is in the background</span>
              ) : isBrowserPushSupported() ? (
                <span>Allow notifications to get push-style alerts while Insidr is open.</span>
              ) : (
                <span className="text-amber-300">Not supported in this browser</span>
              )}
            </p>
          </div>
        </div>
        {!pushReady && isBrowserPushSupported() && (
          <button
            type="button"
            onClick={enableBrowserPush}
            disabled={enablingPush}
            className="btn-ghost text-xs px-3 py-2 border border-border inline-flex items-center gap-2"
          >
            {enablingPush ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
            Enable notifications
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-text-muted flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Loading alert rules…
        </p>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => {
            const meta = RULE_LABELS[rule.rule_key] || {
              label: rule.rule_key,
              description: 'Custom alert rule.',
            };
            return (
              <div key={rule.id || rule.rule_key} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-main">{meta.label}</p>
                    <p className="text-xs text-text-muted mt-1">{meta.description}</p>
                  </div>
                  <Toggle
                    label={rule.enabled ? 'On' : 'Off'}
                    active={rule.enabled}
                    onClick={() => updateRule(rule.rule_key, { enabled: !rule.enabled })}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <label className="text-text-muted">
                    Min confidence %
                    <input
                      type="number"
                      min={50}
                      max={99}
                      value={rule.threshold ?? 70}
                      onChange={(e) =>
                        updateRule(rule.rule_key, { threshold: Number(e.target.value) })
                      }
                      className="dash-input ml-2 w-20 py-1 text-xs"
                    />
                  </label>
                  <span className="text-text-muted flex items-center gap-2">
                    Channels:
                    <Toggle
                      label="In-app"
                      active={rule.channel_in_app}
                      onClick={() =>
                        updateRule(rule.rule_key, { channel_in_app: !rule.channel_in_app })
                      }
                    />
                    <Toggle
                      label="Email"
                      active={rule.channel_email}
                      onClick={() =>
                        updateRule(rule.rule_key, { channel_email: !rule.channel_email })
                      }
                    />
                    <Toggle
                      label="Push"
                      active={rule.channel_push && pushReady}
                      disabled={!isBrowserPushSupported()}
                      onClick={() => togglePushChannel(rule.rule_key, !rule.channel_push)}
                    />
                  </span>
                  {!pushReady && rule.channel_push && (
                    <span className="text-[10px] text-amber-300 w-full">
                      Enable browser notifications above to activate push on this rule.
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={savingKey === rule.rule_key}
                  onClick={() => saveRule(rule)}
                  className="btn-primary text-xs px-3 py-1.5 inline-flex items-center gap-2"
                >
                  {savingKey === rule.rule_key ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Radio size={12} />
                  )}
                  Save rule
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default AlertsPanel;
