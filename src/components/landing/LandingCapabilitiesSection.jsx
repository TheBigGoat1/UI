import React from 'react';
import {
  BrainCircuit,
  Globe,
  LineChart,
  ShieldCheck,
  Zap,
  TrendingUp,
} from 'lucide-react';
import LandingSectionHeader from './LandingSectionHeader';
import ScrollReveal from '../motion/ScrollReveal';

const CAPABILITIES = [
  {
    icon: BrainCircuit,
    color: 'text-secondary',
    title: 'Macro Intelligence',
    desc: 'Central bank tone, CPI, and yields synthesized into actionable regime labels.',
  },
  {
    icon: Globe,
    color: 'text-primary',
    title: 'Global Sentiment',
    desc: 'Bullish vs bearish breadth across outlets, drilled down per pair.',
  },
  {
    icon: LineChart,
    color: 'text-success',
    title: 'Backtest Lab',
    desc: 'Stress-test your logic on years of price before live capital.',
  },
  {
    icon: ShieldCheck,
    color: 'text-secondary',
    title: 'Trade Journal',
    desc: 'Psychology tags, mistake matrix, and equity curve in one place.',
  },
  {
    icon: Zap,
    color: 'text-primary',
    title: 'Economic Calendar',
    desc: 'Impact tiers and surprise indicators when macro data hits.',
  },
  {
    icon: TrendingUp,
    color: 'text-success',
    title: 'Portfolio View',
    desc: 'Equity, margin, and open risk from a single institutional pane.',
  },
];

/** Capabilities — solid band (no background video; Idea Feed owns cinematic video). */
const LandingCapabilitiesSection = () => (
  <section
    id="features"
    className="landing-band landing-band--solid flow-section--divider"
    aria-labelledby="capabilities-title"
  >
    <div className="section-shell landing-capabilities-section__inner">
      <ScrollReveal variant="fade-up">
        <LandingSectionHeader
          eyebrow="Capabilities"
          eyebrowPill
          title="THE COMPLETE ARSENAL"
          titleId="capabilities-title"
          lead="Research, execution support, and review tools designed as one workflow, not disconnected tabs."
        />
      </ScrollReveal>

      <div className="landing-capabilities">
        {CAPABILITIES.map((f, i) => (
          <ScrollReveal
            key={f.title}
            variant="bounce"
            delay={(i % 2) * 90 + Math.floor(i / 2) * 110}
            className="h-full"
          >
            <article className="landing-capability landing-capability--card landing-capability--interactive h-full">
              <div className="landing-capability__icon">
                <f.icon className={f.color} size={24} aria-hidden="true" />
              </div>
              <div>
                <h3 className="landing-capability__title">{f.title}</h3>
                <p className="landing-capability__desc">{f.desc}</p>
              </div>
            </article>
          </ScrollReveal>
        ))}
      </div>
    </div>
  </section>
);

export default LandingCapabilitiesSection;
