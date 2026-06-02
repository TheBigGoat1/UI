import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Zap, Crown, Loader2, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api/api';
import PageHeader from '../components/layout/PageHeader';
import PlanFeatureMatrix from '../components/billing/PlanFeatureMatrix.jsx';
import BillingTestPanel from '../components/billing/BillingTestPanel.jsx';
import { useFeatureAccess } from '../hooks/useFeatureAccess.js';

const PRO_MRKT_FEATURES = [
  'Chart labels & callouts',
  'Target & pullback levels',
  'Calendar on chart',
  'News AI insights',
];

const PRO_FEATURES = [
  ...PRO_MRKT_FEATURES,
  'Live AI trade ideas',
  'Strategy backtest lab',
  'Web journal & analytics',
  'Economic calendar',
];

const ELITE_FEATURES = [
  'Everything in Pro',
  'Priority idea generation',
  'API & webhooks (roadmap)',
  'Priority support',
];

const FREE_FEATURES = [
  'Insidr desk — chart & live price',
  'News feed (read)',
  'Swing / day sentiment',
  'Journal & calendar browse',
];

const Pricing = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [billingCycle, setBillingCycle] = useState('annual');
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutNotice, setCheckoutNotice] = useState('');
  const access = useFeatureAccess();
  const billingHealth = access.billingHealth;

  const isDev = import.meta.env.DEV;

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (searchParams.get('checkout') !== 'success' && !sessionId) return;

    (async () => {
      setCheckoutNotice('Confirming your subscription…');
      try {
        if (sessionId) {
          const res = await api.billing.verifySession(sessionId);
          if (res?.success) {
            await refreshUser();
            setSearchParams({}, { replace: true });
            navigate('/dashboard?welcome=1&checkout=success', { replace: true });
            return;
          }
          setCheckoutError(res?.error || 'Could not verify checkout.');
        } else {
          await refreshUser();
          navigate('/dashboard?welcome=1&checkout=success', { replace: true });
        }
      } catch (err) {
        setCheckoutError(err.error || 'Checkout verification failed.');
      }
    })();
  }, [searchParams, refreshUser, setSearchParams, navigate]);

  const startCheckout = async (plan) => {
    setLoadingPlan(plan);
    setCheckoutError('');
    setCheckoutNotice('');
    try {
      const res = await api.billing.createCheckout({
        plan,
        billingCycle,
        context: 'upgrade',
      });
      if (res?.data?.url) {
        window.location.href = res.data.url;
      } else {
        setCheckoutError(
          res?.error ||
            'Could not start checkout. Set STRIPE_SECRET_KEY and business name in Stripe dashboard.',
        );
      }
    } catch (err) {
      setCheckoutError(err.error || 'Checkout failed.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const startDevTrial = async (plan) => {
    setLoadingPlan(`dev-${plan}`);
    setCheckoutError('');
    try {
      const res = await api.billing.startDevTrial({ plan, billingCycle });
      if (res?.success) {
        await refreshUser();
        setCheckoutNotice(
          `${plan === 'elite' ? 'Elite' : 'Pro'} trial started — ${res.data?.access?.message || '7 days free'}`,
        );
      } else {
        setCheckoutError(res?.error || 'Dev trial failed.');
      }
    } catch (err) {
      setCheckoutError(err.error || 'Dev trial failed.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const openPortal = async () => {
    try {
      const res = await api.billing.portal();
      if (res?.data?.url) window.location.href = res.data.url;
      else setCheckoutError(res?.error || 'Billing portal unavailable.');
    } catch (err) {
      setCheckoutError(err.error || 'Billing portal unavailable.');
    }
  };

  const tier = user?.tier || 'free';
  const isPro = tier === 'pro' || tier === 'elite';
  const isElite = tier === 'elite';
  const isFree = !isPro;
  const isTrialing = user?.subscription_status === 'trialing';

  return (
    <div className="dash-page max-w-6xl mx-auto pb-12">
      <PageHeader
        icon={Zap}
        title="Plans & pricing"
        description="7-day free trial — card required, no charge until trial ends. Billing starts automatically after day 7."
      />

      <BillingTestPanel health={billingHealth} tier={access.tier} className="mb-4" />

      <p className="text-xs text-text-muted mb-4">
        7-day trial, then billed automatically. Card <code className="text-[#a78bfa]">4242…</code> in
        test mode.{' '}
        <Link to="/legal/terms" className="text-primary hover:underline">
          Terms
        </Link>
      </p>

      {checkoutNotice && (
        <div className="mb-4 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-sm text-emerald-300">
          {checkoutNotice}
        </div>
      )}

      {checkoutError && (
        <div className="mb-4 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-sm flex gap-3">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-200 mb-1">Checkout could not start</p>
            <p className="text-red-200/80 text-xs leading-relaxed whitespace-pre-wrap">{checkoutError}</p>
            <p className="text-xs text-text-muted mt-2">
              Platform setup fix (owner only): open{' '}
              <a
                href="https://dashboard.stripe.com/test/settings/business-details"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Business details
              </a>{' '}
              and set a public business name, or add{' '}
              <code className="px-1 bg-black/30 rounded">STRIPE_BUSINESS_NAME=Insidr</code> to .env
              and restart the API. End users can still checkout with regular personal cards.
            </p>
          </div>
        </div>
      )}

      {isDev && billingHealth && (
        <div
          className={`mb-6 p-4 rounded-xl border text-sm flex flex-wrap items-start gap-3 ${
            billingHealth.stripe_configured
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-amber-500/30 bg-amber-500/10'
          }`}
        >
          {billingHealth.stripe_configured ? (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="text-xs text-text-muted leading-relaxed">
            <p className="font-bold text-text-main mb-1">Stripe checkout smoke test</p>
            <ul className="space-y-1">
              <li>
                Secret key:{' '}
                <strong className={billingHealth.stripe_configured ? 'text-emerald-400' : 'text-amber-300'}>
                  {billingHealth.stripe_configured ? 'configured' : 'missing — add STRIPE_SECRET_KEY to .env'}
                </strong>
              </li>
              <li>
                Webhook:{' '}
                {billingHealth.webhook_configured ? 'configured' : 'optional for local (use session verify)'}
              </li>
              <li>
                Dev trial: {billingHealth.dev_trial_enabled ? 'enabled' : 'disabled in production'}
              </li>
            </ul>
            {!billingHealth.stripe_configured && (
              <p className="mt-2">
                Use <strong className="text-text-main">Dev: trial without Stripe</strong> below to test Pro
                gates locally.
              </p>
            )}
          </div>
        </div>
      )}

      {user?.subscription_status && user.subscription_status !== 'none' && (
        <div className="mb-6 p-4 rounded-xl border border-border bg-surface flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Current plan</p>
            <p className="text-lg font-bold capitalize">
              {tier} · {user.subscription_status}
              {isTrialing && user.trial_ends_at && (
                <span className="text-sm font-normal text-text-muted ml-2">
                  trial ends {new Date(user.trial_ends_at).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>
          <button type="button" onClick={openPortal} className="btn-ghost text-sm px-4 py-2">
            Manage payment method
          </button>
        </div>
      )}

      <div className="flex justify-center mb-8">
        <div className="bg-surface border border-border p-1 rounded-xl inline-flex shadow-sm">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
              billingCycle === 'monthly'
                ? 'bg-primary text-bg-deep shadow'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
              billingCycle === 'annual'
                ? 'bg-primary text-bg-deep shadow'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            Annual
            <span className="ml-1.5 text-[10px] font-bold uppercase opacity-90">Save ~17%</span>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-stretch">
        <div
          className={`bg-surface border rounded-2xl p-6 flex flex-col ${
            isFree ? 'border-primary ring-1 ring-primary/30' : 'border-border'
          }`}
        >
          {isFree && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2">
              Your plan
            </span>
          )}
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={18} className="text-text-muted" />
            <h2 className="text-xl font-bold">Free</h2>
          </div>
          <p className="text-3xl font-bold mb-1">
            $0
            <span className="text-sm font-normal text-text-muted"> / forever</span>
          </p>
          <p className="text-xs text-text-muted mb-5">Explore the platform with core tools.</p>
          <ul className="space-y-2.5 mb-6 flex-1 text-sm text-text-muted">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <Check size={16} className="text-text-muted shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
          <button type="button" disabled className="w-full py-3 rounded-lg border border-border font-bold opacity-60">
            {isFree ? 'Current plan' : 'Included'}
          </button>
        </div>

        <div
          className={`bg-surface border rounded-2xl p-6 flex flex-col ${
            tier === 'pro' ? 'border-primary ring-1 ring-primary/30' : 'border-border'
          }`}
        >
          <h2 className="text-xl font-bold mb-1">Insidr Pro</h2>
          <p className="text-3xl font-bold mb-0.5">
            ${billingCycle === 'annual' ? '280' : '28'}
            <span className="text-sm font-normal text-text-muted">
              /{billingCycle === 'annual' ? 'year' : 'mo'}
            </span>
          </p>
          <p className="text-xs text-text-muted mb-5">
            {billingCycle === 'annual' ? '~$23.33/mo billed yearly' : 'Billed monthly after trial'}
          </p>
          <ul className="space-y-2.5 mb-6 flex-1 text-sm text-text-muted">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <Check size={16} className="text-primary shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
          <div className="space-y-2">
            <button
              type="button"
              disabled={isPro || loadingPlan === 'pro'}
              onClick={() => startCheckout('pro')}
              className="w-full py-3 rounded-lg border border-border font-bold disabled:opacity-50 btn-ghost hover:border-primary/40"
            >
              {loadingPlan === 'pro' ? (
                <Loader2 className="mx-auto animate-spin" size={20} />
              ) : isPro && !isElite ? (
                'Current plan'
              ) : isElite ? (
                'Included in Elite'
              ) : (
                'Start 7-day free trial'
              )}
            </button>
            {isDev && !isPro && (
              <button
                type="button"
                disabled={loadingPlan === 'dev-pro'}
                onClick={() => startDevTrial('pro')}
                className="w-full py-2 text-[10px] font-bold text-text-muted hover:text-primary"
              >
                {loadingPlan === 'dev-pro' ? 'Starting…' : 'Dev: trial without Stripe'}
              </button>
            )}
          </div>
        </div>

        <div
          className={`bg-surface border-2 rounded-2xl p-6 flex flex-col relative ${
            isElite ? 'border-primary' : 'border-primary/60'
          }`}
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-bg-deep text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <Crown size={10} /> Best value
          </div>
          <h2 className="text-xl font-bold text-primary mb-1 mt-2">Insidr Elite</h2>
          <p className="text-3xl font-bold mb-0.5">
            ${billingCycle === 'annual' ? '790' : '79'}
            <span className="text-sm font-normal text-text-muted">
              /{billingCycle === 'annual' ? 'year' : 'mo'}
            </span>
          </p>
          <p className="text-xs text-text-muted mb-5">
            {billingCycle === 'annual' ? '~$65.83/mo billed yearly' : 'Billed monthly after trial'}
          </p>
          <ul className="space-y-2.5 mb-6 flex-1 text-sm">
            {ELITE_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <Check size={16} className="text-primary shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
          <div className="space-y-2">
            <button
              type="button"
              disabled={isElite || loadingPlan === 'elite'}
              onClick={() => startCheckout('elite')}
              className="w-full py-3 rounded-lg btn-primary font-bold disabled:opacity-50"
            >
              {loadingPlan === 'elite' ? (
                <Loader2 className="mx-auto animate-spin" size={20} />
              ) : isElite ? (
                'Current plan'
              ) : (
                'Start 7-day free trial'
              )}
            </button>
            {isDev && !isElite && (
              <button
                type="button"
                disabled={loadingPlan === 'dev-elite'}
                onClick={() => startDevTrial('elite')}
                className="w-full py-2 text-[10px] font-bold text-text-muted hover:text-primary"
              >
                {loadingPlan === 'dev-elite' ? 'Starting…' : 'Dev: trial without Stripe'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-bold text-text-main mb-3">Compare plans</h2>
        <PlanFeatureMatrix />
      </div>
    </div>
  );
};

export default Pricing;
