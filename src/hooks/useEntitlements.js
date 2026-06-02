import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { hasCapability, hasPaidAccess, listCapabilities } from '../utils/entitlements.js';

export function useEntitlements() {
  const { user, isAuthenticated, loading } = useAuth();

  return useMemo(() => {
    const paid = hasPaidAccess(user);
    const tier = user?.tier || 'free';
    const capabilities = listCapabilities(user);

    return {
      user,
      loading,
      isAuthenticated,
      tier,
      paid,
      capabilities,
      hasCapability: (cap) => hasCapability(user, cap),
      canGenerateIdeas: hasCapability(user, 'ideas.generate'),
      canRunBacktest: hasCapability(user, 'backtest.run'),
      canUseAdvancedChat: hasCapability(user, 'chat.advanced'),
      canChartLabels: hasCapability(user, 'chart.labels'),
      canChartTargets: hasCapability(user, 'chart.targets'),
      canChartCalendar: hasCapability(user, 'chart.calendar'),
      canNewsAi: hasCapability(user, 'news.ai_insight'),
      canTerminal: hasCapability(user, 'terminal.basic'),
      isPro: tier === 'pro' || tier === 'elite',
      isElite: tier === 'elite',
      isFree: !paid,
      isTrialing: user?.subscription_status === 'trialing' && paid,
      trialEndsAt: user?.trial_ends_at || null,
    };
  }, [user, isAuthenticated, loading]);
}
