import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const TESTIMONIALS = [
  { q: 'Macro sentiment alone pays for the subscription.', n: 'Alex M.', r: 'Prop firm' },
  { q: 'Rationale breakdowns teach institutional thinking.', n: 'Sarah J.', r: 'FX trader' },
  { q: 'Desk-grade UI that matches the edge.', n: 'David K.', r: 'Algo dev' },
];

const LandingTrustSection = () => (
  <section className="landing-band landing-band--raised flow-section--divider landing-section--balanced" id="testimonials">
    <div className="section-shell">
      <header className="landing-block-head">
        <p className="landing-block-head__eyebrow">Voices</p>
        <h2 className="landing-block-head__title">Trusted by traders</h2>
        <p className="landing-block-head__lead">Prop firms, FX desks, and independent algos.</p>
      </header>
      <div className="landing-grid landing-grid--3">
        {TESTIMONIALS.map((t) => (
          <blockquote key={t.n} className="landing-card landing-card--quote">
            <p>&ldquo;{t.q}&rdquo;</p>
            <footer>
              <cite className="landing-card__author">{t.n}</cite>
              <span className="landing-card__role">{t.r}</span>
            </footer>
          </blockquote>
        ))}
      </div>
      <aside className="landing-cta-panel landing-surface" aria-label="Start your free trial">
        <div className="landing-cta-panel__glow" aria-hidden />
        <p className="landing-cta-panel__eyebrow">Get started</p>
        <h3 className="landing-cta-panel__title">Ready for your edge?</h3>
        <p className="landing-cta-panel__lead">Full platform access for seven days — no card required to explore.</p>
        <Link to="/register" className="btn-primary landing-cta-panel__btn inline-flex px-8 py-3.5 gap-2">
          Create free account
          <ArrowRight size={18} aria-hidden />
        </Link>
      </aside>
    </div>
  </section>
);

export default LandingTrustSection;
