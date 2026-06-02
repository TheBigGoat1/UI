import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Sparkles } from 'lucide-react';

import { featureMeta } from '../../config/features.js';

const FEATURE_COPY = {
  'chart.labels': {
    title: 'Chart labels are a Pro feature',
    body: 'Insidr callouts and session notes on your chart. Start a 7-day test trial — production locks apply.',
    required: 'Pro or Elite',
  },
  'chart.targets': {
    title: 'Targets & pullbacks require Pro',
    body: 'Target lines and pullback zones on the Insidr desk.',
    required: 'Pro or Elite',
  },
  'chart.calendar': {
    title: 'Calendar overlays are Pro',
    body: 'High-impact economic events on the chart timeline.',
    required: 'Pro or Elite',
  },
  'news.ai_insight': {
    title: 'News AI insights require Pro',
    body: 'Brain icons open AI context on headline impact.',
    required: 'Pro or Elite',
  },
  'backtest.run': {
    title: 'Backtest lab is a Pro feature',
    body: 'Walk-forward simulations use the same engine as live ideas. Upgrade to validate setups before you size up.',
    required: 'Pro or Elite',
  },
  'ideas.generate': {
    title: 'AI idea generation requires Pro',
    body: 'Scan markets and save ranked setups with entry, stop, and target. Free tier can browse existing ideas.',
    required: 'Pro or Elite',
  },
  'chat.advanced': {
    title: 'Advanced AI chat is Elite',
    body: 'Priority context and deeper analysis — available on Elite.',
    required: 'Elite',
  },
};

const UpgradeGate = ({
  feature = 'backtest.run',
  compact = false,
  className = '',
  onDevTrial,
  devTrialLoading = false,
  showDevTrial = false,
}) => {
  const meta = featureMeta(feature);
  const copy =
    FEATURE_COPY[feature] ||
    (meta
      ? {
          title: meta.upgradeTitle || `${meta.label} requires upgrade`,
          body: meta.upgradeBody || 'Upgrade to unlock this Insidr feature.',
          required: meta.tiers?.includes('elite') && !meta.tiers?.includes('pro') ? 'Elite' : 'Pro or Elite',
        }
      : FEATURE_COPY['backtest.run']);

  if (compact) {
    return (
      <div
        className={`rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 flex flex-wrap items-center gap-2 ${className}`}
      >
        <Lock size={14} className="shrink-0" />
        <span>{copy.title}</span>
        <Link to="/dashboard/pricing" className="text-primary font-bold hover:underline ml-auto">
          Upgrade
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-5 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/15 text-primary shrink-0">
          <Sparkles size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-text-main">{copy.title}</p>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">{copy.body}</p>
          <p className="text-[10px] text-text-muted mt-2 uppercase tracking-wider font-bold">
            Requires {copy.required}
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Link to="/dashboard/pricing" className="btn-primary text-sm py-2 px-4">
              View plans · 7-day trial
            </Link>
            {showDevTrial && onDevTrial && (
              <button
                type="button"
                onClick={onDevTrial}
                disabled={devTrialLoading}
                className="btn-ghost text-xs py-2 px-3 border border-border"
              >
                {devTrialLoading ? 'Starting…' : 'Dev: start trial without Stripe'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeGate;
