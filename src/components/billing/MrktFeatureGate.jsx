import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { featureMeta } from '../../config/features.js';

/**
 * Inline lock for MRKT terminal controls — production logic, test Stripe checkout.
 */
const MrktFeatureGate = ({
  feature,
  allowed,
  children,
  compact = true,
  className = '',
  onBlockedClick,
}) => {
  if (allowed) return children;

  const meta = featureMeta(feature);
  const title = meta?.upgradeTitle || `${meta?.label || 'Feature'} requires Pro`;
  const body = meta?.upgradeBody || 'Start a 7-day trial with test Stripe — no charge until trial ends.';

  if (compact) {
    return (
      <div className={`mrkt-feature-lock ${className}`}>
        <button
          type="button"
          className="mrkt-feature-lock__btn"
          onClick={onBlockedClick}
          title={title}
        >
          <Lock size={11} />
          {children}
        </button>
      </div>
    );
  }

  return (
    <div className={`mrkt-feature-lock-panel ${className}`}>
      <Lock size={14} className="text-[#8b5cf6] shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-bold text-white">{title}</p>
        <p className="text-[10px] text-text-muted mt-0.5">{body}</p>
        <Link to="/dashboard/pricing" className="mrkt-feature-lock__link">
          View plans · test checkout
        </Link>
      </div>
    </div>
  );
};

export default MrktFeatureGate;
