import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  Shield,
  FlaskConical,
  Loader2,
  Crown,
  Zap,
  User,
} from 'lucide-react';
import { api } from '../../services/api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

const TIER_STYLES = {
  free: { label: 'Free', icon: User, className: 'mrkt-tier-pill--free' },
  pro: { label: 'Pro', icon: Zap, className: 'mrkt-tier-pill--pro' },
  elite: { label: 'Elite', icon: Crown, className: 'mrkt-tier-pill--elite' },
};

/**
 * Single billing strip: test Stripe notice + current tier + optional tier simulator (test keys only).
 */
const BillingStatusStrip = ({
  health,
  status,
  tier,
  paid,
  isTrialing,
  trialEndsAt,
  onTierChange,
  className = '',
}) => {
  const { refreshUser } = useAuth();
  const [simulating, setSimulating] = useState(null);

  const showTest = health?.test_checkout || health?.stripe_mode === 'test';
  const canSimulate = showTest && health?.tier_simulator_enabled;
  const showMismatch = health?.key_mismatch_warning;
  const tierKey = (tier || 'free').toLowerCase();
  const TierIcon = TIER_STYLES[tierKey]?.icon || User;

  if (!showTest && !showMismatch && !canSimulate && paid) return null;

  const runSimulate = async (simulateTier) => {
    setSimulating(simulateTier);
    try {
      const res = await api.billing.simulateTier({ tier: simulateTier });
      if (res?.success) {
        await refreshUser();
        onTierChange?.(res.data);
      }
    } finally {
      setSimulating(null);
    }
  };

  return (
    <div className={`mrkt-billing-strip ${className}`} role="region" aria-label="Subscription status">
      <div className="mrkt-billing-strip__row">
        {showTest && (
          <span className="mrkt-billing-strip__test-badge">
            <FlaskConical size={12} />
            Stripe test
          </span>
        )}

        <span className={`mrkt-tier-pill ${TIER_STYLES[tierKey]?.className || ''}`}>
          <TierIcon size={11} />
          {TIER_STYLES[tierKey]?.label || tier}
          {isTrialing && paid && (
            <span className="mrkt-tier-pill__trial">trial</span>
          )}
        </span>

        {paid && isTrialing && trialEndsAt && (
          <span className="mrkt-billing-strip__meta">
            until {new Date(trialEndsAt).toLocaleDateString()}
          </span>
        )}

        {!paid && (
          <Link to="/dashboard/pricing" className="mrkt-billing-strip__upgrade">
            Unlock Pro features
          </Link>
        )}

        <div className="mrkt-billing-strip__spacer" />

        {canSimulate && (
          <div className="mrkt-billing-strip__sim" role="group" aria-label="Simulate subscription tier">
            <span className="mrkt-billing-strip__sim-label">Preview as</span>
            {['free', 'pro', 'elite'].map((t) => (
              <button
                key={t}
                type="button"
                disabled={Boolean(simulating)}
                className={`mrkt-billing-strip__sim-btn ${
                  tierKey === t ? 'mrkt-billing-strip__sim-btn--active' : ''
                }`}
                onClick={() => runSimulate(t)}
              >
                {simulating === t ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  TIER_STYLES[t]?.label || t
                )}
              </button>
            ))}
          </div>
        )}

        <span className="mrkt-billing-strip__locks" title="Production subscription locks">
          <Shield size={10} />
          locks on
        </span>

        <Link to="/dashboard/pricing" className="mrkt-billing-strip__billing-link">
          <CreditCard size={12} />
          Billing
        </Link>
      </div>

      {showTest && (
        <p className="mrkt-billing-strip__hint">
          Production payment rules apply. Test card{' '}
          <code>4242 4242 4242 4242</code> — no real charges.
          {canSimulate && ' Use Preview as to switch Free / Pro / Elite instantly.'}
        </p>
      )}

      {showMismatch && (
        <p className="mrkt-billing-strip__warn">{health.key_mismatch_warning}</p>
      )}
    </div>
  );
};

export default BillingStatusStrip;
