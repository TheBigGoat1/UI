import React from 'react';
import { BrainCircuit, Globe, LineChart, ShieldCheck, Zap, TrendingUp } from 'lucide-react';

const CAPABILITIES = [
  { icon: BrainCircuit, title: 'Macro Intelligence', desc: 'Central bank tone, CPI, and yields into regime labels.' },
  { icon: Globe, title: 'Global Sentiment', desc: 'Bullish vs bearish breadth, drilled down per pair.' },
  { icon: LineChart, title: 'Backtest Lab', desc: 'Stress-test logic on historical price before live capital.' },
  { icon: ShieldCheck, title: 'Trade Journal', desc: 'Psychology tags, mistake matrix, and equity curve.' },
  { icon: Zap, title: 'Economic Calendar', desc: 'Impact tiers when macro data hits.' },
  { icon: TrendingUp, title: 'Portfolio View', desc: 'Equity, margin, and open risk in one pane.' },
];

const LandingCapabilitiesSection = () => (
  <section className="landing-band landing-band--raised flow-section--divider landing-section--balanced" id="capabilities">
    <div className="section-shell">
      <header className="landing-block-head">
        <p className="landing-block-head__eyebrow">Capabilities</p>
        <h2 className="landing-block-head__title">Desk-grade modules</h2>
        <p className="landing-block-head__lead">Six core tools aligned with your dashboard.</p>
      </header>
      <div className="landing-grid landing-grid--3">
        {CAPABILITIES.map((cap) => (
          <article key={cap.title} className="landing-card">
            <div className="landing-card__icon">
              <cap.icon size={20} aria-hidden="true" />
            </div>
            <h3>{cap.title}</h3>
            <p>{cap.desc}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default LandingCapabilitiesSection;
