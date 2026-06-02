import React from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Shield, FlaskConical } from 'lucide-react';

const BillingTestBanner = ({ health, status, className = '' }) => {
  if (!health) return null;

  const showTest = health.test_checkout || health.stripe_mode === 'test';
  const showMismatch = health.key_mismatch_warning;

  if (!showTest && !showMismatch) return null;

  return (
    <div className={`mrkt-billing-banner ${className}`} role="status">
      <div className="mrkt-billing-banner__inner">
        <FlaskConical size={16} className="shrink-0 text-[#8b5cf6]" />
        <div className="min-w-0 flex-1">
          {showTest && (
            <>
              <p className="text-xs font-bold text-white">
                Stripe test mode — production subscription locks active
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">
                Use card <code className="text-[#a78bfa]">4242 4242 4242 4242</code>. Same gates as
                live; no real charges.
                {status?.subscription_status === 'trialing' && status?.trial_ends_at && (
                  <> Trial ends {new Date(status.trial_ends_at).toLocaleDateString()}.</>
                )}
              </p>
            </>
          )}
          {showMismatch && (
            <p className="text-[10px] text-amber-300 mt-1">{health.key_mismatch_warning}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="mrkt-billing-banner__pill">
            <Shield size={10} /> locks on
          </span>
          <Link to="/dashboard/pricing" className="mrkt-billing-banner__cta">
            <CreditCard size={12} /> Billing
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BillingTestBanner;
