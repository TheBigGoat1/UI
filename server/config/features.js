/**
 * MRKT / Insidr feature catalog — single source for API capability checks.
 * Mirror changes in src/config/features.js
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
  },
  'chart.targets': {
    tiers: ['pro', 'elite'],
    label: 'Target & pullback levels',
    mrkt: true,
  },
  'chart.calendar': {
    tiers: ['pro', 'elite'],
    label: 'Calendar events on chart',
    mrkt: true,
  },
  'news.ai_insight': {
    tiers: ['pro', 'elite'],
    label: 'Insidr Analysis (Claude)',
    mrkt: true,
  },
  'ideas.generate': {
    tiers: ['pro', 'elite'],
    label: 'AI trade ideas',
    mrkt: false,
  },
  'backtest.run': {
    tiers: ['pro', 'elite'],
    label: 'Backtest lab',
    mrkt: false,
  },
  'chat.advanced': {
    tiers: ['elite'],
    label: 'Advanced AI chat',
    mrkt: false,
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
  'admin.observe': {
    tiers: ['admin', 'super_admin', 'support_admin'],
    label: 'Admin monitoring',
    mrkt: false,
  },
};

/** Build CAPABILITIES map for subscriptionAccess */
export function buildCapabilitiesMap() {
  const map = {};
  for (const [key, meta] of Object.entries(FEATURE_CATALOG)) {
    map[key] = meta.tiers;
  }
  return map;
}

export const MRKT_FEATURE_KEYS = Object.keys(FEATURE_CATALOG).filter(
  (k) => FEATURE_CATALOG[k].mrkt,
);
