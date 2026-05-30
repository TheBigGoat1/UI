import React from 'react';
import { CheckCircle2 } from 'lucide-react';

const FEATURES = [
  'Multi-timeframe pattern recognition',
  'Per-asset news sentiment scoring',
  'Risk-based position sizing on every ticket',
];

const LandingSignalsSection = () => (
  <section className="landing-band landing-band--solid flow-section--divider" id="showcase">
    <div className="section-shell">
      <header className="landing-block-head">
        <p className="landing-block-head__eyebrow">Idea feed</p>
        <h2 className="landing-block-head__title">Ranked setups, not noise</h2>
        <p className="landing-block-head__lead">
          Every ticket includes entry, targets, stops, and a thesis you can audit before sizing.
        </p>
      </header>
      <div className="landing-split landing-split--editorial">
        <ul className="landing-checklist">
          {FEATURES.map((text) => (
            <li key={text}>
              <CheckCircle2 size={18} />
              {text}
            </li>
          ))}
        </ul>
        <article className="landing-setup-ticket">
          <div className="landing-setup-ticket__header">
            <span className="landing-setup-ticket__pair">BTC/USDT</span>
            <span className="landing-setup-ticket__badge">Long · 87%</span>
          </div>
          <p className="landing-setup-ticket__body">
            Structure break above weekly POC with bullish divergence on 4H RSI. Target liquidity at
            prior swing high; stop below order block base.
          </p>
          <p className="landing-setup-ticket__meta">Risk 1.2R · Size via dashboard calculator</p>
        </article>
      </div>
    </div>
  </section>
);

export default LandingSignalsSection;
