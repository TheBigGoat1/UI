import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api/api.js';
import {
  hasCapability,
  hasPaidAccess,
  listCapabilities,
} from '../utils/entitlements.js';
import { featureMeta } from '../config/features.js';

export function useFeatureAccess() {
  const { user, loading: authLoading } = useAuth();
  const [billingHealth, setBillingHealth] = useState(null);
  const [billingStatus, setBillingStatus] = useState(null);
  const [billingTick, setBillingTick] = useState(0);

  const refetchBilling = useCallback(() => {
    setBillingTick((n) => n + 1);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.billing.health().catch(() => null),
      user ? api.billing.status().catch(() => null) : Promise.resolve(null),
    ]).then(([healthRes, statusRes]) => {
      if (!active) return;
      if (healthRes?.success) setBillingHealth(healthRes.data);
      if (statusRes?.success) setBillingStatus(statusRes.data);
    });
    return () => {
      active = false;
    };
  }, [user?.id, user?.subscription_status, user?.tier, billingTick]);

  return useMemo(() => {
    const paid = hasPaidAccess(user);
    const tier = user?.tier || 'free';
    const capabilities = listCapabilities(user);

    const can = (feature) => hasCapability(user, feature);

    return {
      user,
      authLoading,
      tier,
      paid,
      capabilities,
      can,
      billingHealth,
      billingStatus,
      isTrialing: user?.subscription_status === 'trialing' && paid,
      trialEndsAt: user?.trial_ends_at || null,
      isTestStripe: billingHealth?.test_checkout === true,
      locksEnabled: billingHealth?.locks_enabled !== false,
      devTrialEnabled: billingHealth?.dev_trial_enabled === true,
      meta: featureMeta,
      canLabels: can('chart.labels'),
      canTargets: can('chart.targets'),
      canCalendar: can('chart.calendar'),
      canNewsAi: can('news.ai_insight'),
      canTerminal: can('terminal.basic'),
      canIdeas: can('ideas.generate'),
      canBacktest: can('backtest.run'),
      canAdvancedChat: can('chat.advanced'),
      refetchBilling,
    };
  }, [user, authLoading, billingHealth, billingStatus, refetchBilling]);
}
