export const CAPABILITIES = {
  'ideas.generate': ['pro', 'elite'],
  'backtest.run': ['pro', 'elite'],
  'chat.advanced': ['elite'],
  'alerts.manage': ['pro', 'elite'],
  'broker.sync': ['pro', 'elite'],
};

export function hasPaidAccess(user) {
  if (!user) return false;
  const status = user.subscription_status || 'none';
  const tier = user.tier || 'free';

  if (!['active', 'trialing'].includes(status)) return false;
  if (tier !== 'pro' && tier !== 'elite') return false;

  if (status === 'trialing' && user.trial_ends_at) {
    const end = new Date(user.trial_ends_at).getTime();
    if (Number.isNaN(end) || Date.now() > end) return false;
  }

  return true;
}

export function hasCapability(user, capability) {
  const tiers = CAPABILITIES[capability];
  if (!tiers) return false;
  const tier = user?.tier || 'free';
  return tiers.includes(tier) && hasPaidAccess(user);
}

export function listCapabilities(user) {
  return Object.keys(CAPABILITIES).filter((cap) => hasCapability(user, cap));
}
