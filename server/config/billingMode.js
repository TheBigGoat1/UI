/**
 * Billing enforcement & Stripe mode — production locks with test Stripe keys.
 */

export function getBillingModeConfig() {
  const secretKey = process.env.STRIPE_SECRET_KEY || '';
  const publishable = process.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
  const keyImpliesTest = secretKey.startsWith('sk_test_') || publishable.startsWith('pk_test_');
  const keyImpliesLive = secretKey.startsWith('sk_live_') || publishable.startsWith('pk_live_');

  const stripeMode =
    process.env.BILLING_STRIPE_MODE ||
    (keyImpliesLive ? 'live' : keyImpliesTest ? 'test' : 'unknown');

  const enforcement = process.env.BILLING_ENFORCEMENT || 'production';
  const locksEnabled = enforcement === 'production';

  const devTrialEnabled =
    process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_BILLING === 'true';

  const tierSimulatorEnabled =
    stripeMode === "test" ||
    process.env.BILLING_TIER_SIMULATOR === "true" ||
    devTrialEnabled;

  return {
    enforcement,
    stripe_mode: stripeMode,
    locks_enabled: locksEnabled,
    stripe_configured: Boolean(secretKey),
    webhook_configured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    test_checkout: stripeMode === 'test',
    live_checkout: stripeMode === 'live',
    dev_trial_enabled: devTrialEnabled,
    tier_simulator_enabled: tierSimulatorEnabled,
    free_backtest_open:
      process.env.NODE_ENV !== 'production' || process.env.ALLOW_FREE_BACKTEST === 'true',
    /** Warn if live keys in non-production */
    key_mismatch_warning:
      process.env.NODE_ENV !== 'production' && keyImpliesLive
        ? 'Live Stripe keys detected in development — use sk_test_ for QA'
        : null,
  };
}
