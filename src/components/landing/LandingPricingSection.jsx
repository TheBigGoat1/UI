import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

const PLANS = [
  { id: 'pro', name: 'Insidr Pro', monthly: 28, annual: 280, features: ['Live AI ideas', 'Macro sentiment', 'Backtester', 'Web journal'], elite: false },
  { id: 'elite', name: 'Insidr Elite', monthly: 79, annual: 790, features: ['Everything in Pro', 'Predictive models', 'API & webhooks', 'MT4/MT5 sync'], elite: true },
];

const LandingPricingSection = () => {
  const [billingCycle, setBillingCycle] = useState('annual');

  return (
    <section className="landing-band landing-band--solid flow-section--divider" id="pricing">
      <div className="section-shell">
        <header className="landing-block-head">
          <p className="landing-block-head__eyebrow">Pricing</p>
          <h2 className="landing-block-head__title">Choose your edge</h2>
          <p className="landing-block-head__lead">Seven-day risk-free trial on every plan.</p>
        </header>
        <div className="landing-billing">
          {['monthly', 'annual'].map((cycle) => (
            <button
              key={cycle}
              type="button"
              onClick={() => setBillingCycle(cycle)}
              className={`landing-btn landing-btn--sm ${billingCycle === cycle ? 'landing-btn--primary' : 'landing-btn--secondary'}`}
            >
              {cycle === 'annual' ? 'Annual' : 'Monthly'}
            </button>
          ))}
        </div>
        <div className="landing-grid landing-grid--2 landing-pricing-grid">
          {PLANS.map((plan) => (
            <article key={plan.id} className={`landing-card ${plan.elite ? 'landing-card--highlight' : ''}`}>
              {plan.elite && <span className="landing-card__badge">Popular</span>}
              <h3>{plan.name}</h3>
              <p className="landing-card__price">
                ${billingCycle === 'annual' ? plan.annual : plan.monthly}
                <span>/{billingCycle === 'annual' ? 'yr' : 'mo'}</span>
              </p>
              <ul className="landing-checklist">
                {plan.features.map((f) => (
                  <li key={f}><CheckCircle2 size={16} />{f}</li>
                ))}
              </ul>
              <Link to="/register" className={`landing-btn landing-btn--block mt-4 ${plan.elite ? 'landing-btn--primary' : 'landing-btn--secondary'}`}>
                Start trial
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingPricingSection;
