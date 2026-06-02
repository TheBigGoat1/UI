/**
 * Client feature catalog — keep in sync with server/config/features.js
 */

export const FEATURE_CATALOG = {
  'terminal.basic': {
    tiers: ['free', 'pro', 'elite'],
    label: 'Trading terminal',
    mrkt: true,
  },
  'chart.labels': {
    tiers: ['pro', 'elite'],
    label: 'Chart labels & callouts',
    mrkt: true,
    upgradeTitle: 'Chart labels are a Pro feature',
    upgradeBody: 'See MRKT-style callouts tied to headlines and session moves on your chart.',
  },
  'chart.targets': {
    tiers: ['pro', 'elite'],
    label: 'Target & pullback levels',
    mrkt: true,
    upgradeTitle: 'Targets & pullbacks require Pro',
    upgradeBody: 'Display target lines and pullback zones like the MRKT Edge desk.',
  },
  'chart.calendar': {
    tiers: ['pro', 'elite'],
    label: 'Calendar events on chart',
    mrkt: true,
    upgradeTitle: 'Calendar overlays are Pro',
    upgradeBody: 'Plot high-impact economic events directly on the chart timeline.',
  },
  'news.ai_insight': {
    tiers: ['pro', 'elite'],
    label: 'Insidr Analysis (Claude)',
    mrkt: true,
    upgradeTitle: 'Insidr Analysis requires Pro',
    upgradeBody: 'Claude-powered desk notes on every headline — cross-asset read, chat follow-ups, and trade context.',
  },
  'ideas.generate': {
    tiers: ['pro', 'elite'],
    label: 'AI trade ideas',
    mrkt: false,
    upgradeTitle: 'AI idea generation requires Pro',
    upgradeBody: 'Scan markets and save ranked setups with entry, stop, and target.',
  },
  'backtest.run': {
    tiers: ['pro', 'elite'],
    label: 'Backtest lab',
    mrkt: false,
    upgradeTitle: 'Backtest lab is a Pro feature',
    upgradeBody: 'Walk-forward simulations use the same engine as live ideas.',
  },
  'chat.advanced': {
    tiers: ['elite'],
    label: 'Advanced AI chat',
    mrkt: false,
    upgradeTitle: 'Advanced AI chat is Elite',
    upgradeBody: 'Priority context and deeper analysis on Elite.',
  },
  'alerts.manage': {
    tiers: ['pro', 'elite'],
    label: 'Price alerts',
    mrkt: false,
  },
  'broker.sync': {
    tiers: ['pro', 'elite'],
    label: 'Broker connections',
    mrkt: false,
  },
};

export const CAPABILITIES = Object.fromEntries(
  Object.entries(FEATURE_CATALOG).map(([k, v]) => [k, v.tiers]),
);

export const MRKT_FEATURES = Object.entries(FEATURE_CATALOG)
  .filter(([, m]) => m.mrkt)
  .map(([key, m]) => ({ key, ...m }));

export function featureMeta(featureKey) {
  return FEATURE_CATALOG[featureKey] || null;
}
