import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '../../services/api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

const TIERS = ['free', 'pro', 'elite'];

/**
 * Compact test controls — Plans page only. No lecturing copy.
 */
const BillingTestPanel = ({ health, tier, className = '' }) => {
  const { refreshUser } = useAuth();
  const [simulating, setSimulating] = useState(null);

  const showTest = health?.test_checkout || health?.stripe_mode === 'test';
  const canSimulate = showTest && health?.tier_simulator_enabled;
  const tierKey = (tier || 'free').toLowerCase();

  if (!showTest && !canSimulate) return null;

  const runSimulate = async (simulateTier) => {
    setSimulating(simulateTier);
    try {
      const res = await api.billing.simulateTier({ tier: simulateTier });
      if (res?.success) await refreshUser();
    } finally {
      setSimulating(null);
    }
  };

  return (
    <div className={`mrkt-test-panel ${className}`} role="region" aria-label="Test billing">
      {showTest && <span className="mrkt-test-panel__badge">Stripe test</span>}
      <span className="mrkt-test-panel__current">
        Current: <strong className="capitalize">{tierKey}</strong>
      </span>
      {canSimulate && (
        <div className="mrkt-test-panel__tiers" role="group" aria-label="Switch test tier">
          {TIERS.map((t) => (
            <button
              key={t}
              type="button"
              disabled={Boolean(simulating)}
              className={`mrkt-test-panel__tier-btn ${
                tierKey === t ? 'mrkt-test-panel__tier-btn--active' : ''
              }`}
              onClick={() => runSimulate(t)}
            >
              {simulating === t ? <Loader2 size={12} className="animate-spin" /> : t}
            </button>
          ))}
        </div>
      )}
      {health?.key_mismatch_warning && (
        <p className="mrkt-test-panel__warn">{health.key_mismatch_warning}</p>
      )}
    </div>
  );
};

export default BillingTestPanel;
