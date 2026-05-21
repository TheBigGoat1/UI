import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Star } from 'lucide-react';
import LandingSectionHeader from './LandingSectionHeader';
import ScrollReveal from '../motion/ScrollReveal';

const PLANS = [
  {
    id: 'pro',
    name: 'Insidr Pro',
    monthly: 28,
    annual: 280,
    features: ['Live AI ideas', 'Macro sentiment', 'Backtester', 'Web journal'],
    cta: 'ghost',
    elite: false,
  },
  {
    id: 'elite',
    name: 'Insidr Elite',
    monthly: 79,
    annual: 790,
    features: ['Everything in Pro', 'Predictive models', 'API & webhooks', 'MT4/MT5 sync'],
    cta: 'primary',
    elite: true,
  },
];

/** Pricing — same shell rhythm as Idea Feed and Capabilities. */
const LandingPricingSection = () => {
  const [billingCycle, setBillingCycle] = useState('annual');

  return (
    <section
      id="pricing"
      className="landing-band landing-band--solid landing-pricing-section flow-section--divider"
      aria-labelledby="pricing-title"
    >
      <div className="landing-pricing-section__mesh" aria-hidden="true" />

      <div className="section-shell landing-pricing-section__inner max-w-5xl">
        <ScrollReveal variant="fade-up">
          <LandingSectionHeader
            eyebrow="Pricing"
            eyebrowPill
            title="CHOOSE YOUR EDGE"
            titleId="pricing-title"
            lead="Seven-day risk-free trial on every plan. Upgrade or cancel anytime."
          />
        </ScrollReveal>

        <ScrollReveal variant="fade-up" delay={80} className="flex justify-center">
          <div className="landing-pricing-toggle" role="group" aria-label="Billing cycle">
            {['monthly', 'annual'].map((cycle) => (
              <button
                key={cycle}
                type="button"
                onClick={() => setBillingCycle(cycle)}
                className={`landing-pricing-toggle__btn ${
                  billingCycle === cycle ? 'landing-pricing-toggle__btn--active' : ''
                }`}
              >
                {cycle === 'annual' ? 'Annual -20%' : 'Monthly'}
              </button>
            ))}
          </div>
        </ScrollReveal>

        <div className="landing-pricing-grid">
          {PLANS.map((plan, i) => (
            <ScrollReveal key={plan.id} variant="bounce" delay={i * 160} className="h-full">
              <article
                className={`landing-pricing-card landing-pricing-card--glass landing-pricing-card--interactive h-full ${
                  plan.elite ? 'landing-pricing-card--elite' : ''
                }`}
              >
                {plan.elite && (
                  <span className="landing-pricing-card__badge">
                    <Star size={10} aria-hidden="true" /> Best Value
                  </span>
                )}
                <div className="landing-pricing-card__body">
                  <h3
                    className={`landing-pricing-card__name ${
                      plan.elite ? 'landing-pricing-card__name--elite' : ''
                    }`}
                  >
                    {plan.name}
                  </h3>
                  <p className="landing-pricing-card__price">
                    ${billingCycle === 'annual' ? plan.annual : plan.monthly}
                    <span className="landing-pricing-card__period">
                      /{billingCycle === 'annual' ? 'yr' : 'mo'}
                    </span>
                  </p>
                  <ul className="landing-pricing-card__features">
                    {plan.features.map((t) => (
                      <li key={t} className="landing-pricing-card__feature">
                        <CheckCircle2 size={16} className="text-primary shrink-0" aria-hidden="true" />
                        {t}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/register"
                    className={
                      plan.cta === 'primary'
                        ? 'btn-primary py-3 text-center block w-full'
                        : 'btn-ghost py-3 text-center block w-full'
                    }
                  >
                    Start Free Trial
                  </Link>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingPricingSection;
