import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Globe, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { api } from '../../services/api/api.js';

const envTone = (env) => {
  if (env?.includes('RISK_ON')) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  if (env?.includes('RISK_OFF')) return 'text-red-400 border-red-500/30 bg-red-500/10';
  return 'text-amber-300 border-amber-500/30 bg-amber-500/10';
};

const envIcon = (env) => {
  if (env?.includes('RISK_ON')) return TrendingUp;
  if (env?.includes('RISK_OFF')) return TrendingDown;
  return Minus;
};

const macroTone = (direction) => {
  if (direction === 'high-volatility') return 'text-red-400';
  if (direction === 'elevated') return 'text-amber-400';
  return 'text-emerald-400';
};

/**
 * Unified VIX regime + 9-country macro pulse — same data on Overview and Economy.
 */
const RiskRegimeBanner = ({ compact = false, className = '' }) => {
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.analysis
      .getRiskEnvironment()
      .then((res) => {
        if (active && res?.success) setRisk(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading && !risk) {
    return (
      <div className={`rounded-xl border border-border bg-surface/40 px-4 py-3 text-xs text-text-muted ${className}`}>
        Loading macro regime…
      </div>
    );
  }

  if (!risk) return null;

  const EnvIcon = envIcon(risk.environment);
  const pulse = risk.macroPulse;
  const envLabel = (risk.environment || 'NEUTRAL_RISK').replace(/_/g, ' ');

  if (compact) {
    return (
      <div
        className={`rounded-lg border px-3 py-2 flex flex-wrap items-center gap-3 text-xs ${envTone(risk.environment)} ${className}`}
      >
        <EnvIcon size={14} className="shrink-0" />
        <span className="font-bold">{envLabel}</span>
        {risk.details?.vix?.level != null && (
          <span className="font-mono opacity-90">VIX {risk.details.vix.level}</span>
        )}
        {pulse && (
          <span className="opacity-90">
            Macro risk {pulse.aggregateRisk}
            {pulse.highVolatilityCountries > 0 && ` · ${pulse.highVolatilityCountries} hot`}
          </span>
        )}
        <Link to="/dashboard/economy" className="text-primary font-bold hover:underline ml-auto">
          Economy →
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-border bg-surface/50 p-4 flex flex-col lg:flex-row gap-4 ${className}`}
    >
      <div className="flex items-start gap-3 min-w-[220px]">
        <div className={`p-2.5 rounded-lg border ${envTone(risk.environment)}`}>
          <EnvIcon size={20} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Risk regime</p>
          <p className="text-lg font-bold text-text-main">{envLabel}</p>
          {risk.details?.vix?.level != null && (
            <p className="text-xs font-mono text-text-muted mt-0.5">VIX {risk.details.vix.level}</p>
          )}
          <p className="text-xs text-text-muted mt-1 leading-relaxed max-w-sm">{risk.interpretation}</p>
        </div>
      </div>

      {pulse && (
        <div className="flex-1 rounded-lg border border-border/60 bg-background/30 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5 mb-2">
            <Globe size={12} className="text-primary" /> Macro pulse · {pulse.countryCount} countries
          </p>
          <div className="flex flex-wrap gap-3 text-xs">
            <span>
              Aggregate risk{' '}
              <strong className="font-mono text-text-main">{pulse.aggregateRisk}</strong>
            </span>
            <span className="text-red-400">{pulse.highVolatilityCountries} high-vol</span>
            <span className="text-amber-400">{pulse.elevatedCountries} elevated</span>
            <span className="text-emerald-400">{pulse.stableCountries} stable</span>
          </div>
          {pulse.topCountry && (
            <p className="text-xs text-text-muted mt-2">
              Hottest:{' '}
              <strong className={`${macroTone(pulse.topCountry.direction)}`}>
                {pulse.topCountry.label}
              </strong>{' '}
              (score {pulse.topCountry.riskScore})
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col justify-center gap-2 shrink-0">
        <Link
          to="/dashboard/economy"
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
        >
          <Activity size={14} /> Economy detail
        </Link>
        <Link
          to="/dashboard/calendar"
          className="text-xs font-bold text-text-muted hover:text-primary flex items-center gap-1"
        >
          Calendar events
        </Link>
      </div>
    </div>
  );
};

export default RiskRegimeBanner;
