import React, { useEffect, useState } from 'react';
import { Activity, Database, Mail, RefreshCw, Server, Zap } from 'lucide-react';
import { api } from '../../services/api/api.js';

const PlatformHealthBar = ({ onRefresh }) => {
  const [health, setHealth] = useState(null);
  const [billing, setBilling] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [sys, bill, alertHealth] = await Promise.all([
        api.system.getHealth().catch(() => ({ success: false })),
        api.billing.health().catch(() => ({ success: false })),
        api.alerts.health().catch(() => ({ success: false })),
      ]);
      if (sys?.success) setHealth(sys.data);
      if (bill?.success) setBilling(bill.data);
      if (alertHealth?.success) setAlerts(alertHealth.data);
    } finally {
      setLoading(false);
      onRefresh?.();
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pills = [
    {
      icon: Database,
      label: 'Database',
      ok: health?.online !== false,
      detail: health?.database || 'postgres',
    },
    {
      icon: Server,
      label: 'Cache',
      ok: true,
      detail: health?.cache?.mode || 'memory',
    },
    {
      icon: Zap,
      label: 'Stripe',
      ok: billing?.stripe_configured,
      detail: billing?.stripe_configured ? 'configured' : 'missing key',
    },
    {
      icon: Mail,
      label: 'Email alerts',
      ok: alerts?.email_configured,
      detail: alerts?.email_configured ? 'Resend' : 'not configured',
    },
  ];

  return (
    <div className="dash-panel">
      <div className="dash-panel__body">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="font-semibold text-text-main flex items-center gap-2">
            <Activity size={16} className="text-primary" />
            Platform health
          </h3>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="btn-ghost text-xs px-3 py-1.5 border border-border inline-flex items-center gap-2"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {pills.map(({ icon: Icon, label, ok, detail }) => (
            <div
              key={label}
              className={`rounded-lg border px-3 py-2.5 ${
                ok ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold text-text-main">
                <Icon size={14} className={ok ? 'text-emerald-400' : 'text-amber-400'} />
                {label}
              </div>
              <p className="text-[10px] text-text-muted mt-1 font-mono capitalize">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlatformHealthBar;
