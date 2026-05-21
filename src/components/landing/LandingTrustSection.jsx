import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star } from 'lucide-react';
import LandingSectionHeader from './LandingSectionHeader';
import ScrollReveal from '../motion/ScrollReveal';

const TESTIMONIALS = [
  {
    q: 'Macro sentiment alone pays for the subscription. Bias in seconds.',
    n: 'Alex M.',
    r: 'Prop Firm',
  },
  {
    q: 'Rationale breakdowns teach institutional thinking, not just entries.',
    n: 'Sarah J.',
    r: 'FX Trader',
  },
  {
    q: 'Dark, fast, desk-grade. Finally a UI that matches the edge.',
    n: 'David K.',
    r: 'Algo Dev',
  },
];

const TestimonialCard = ({ t }) => (
  <article className="landing-testimonial landing-testimonial--glass landing-testimonial--revolve h-full">
    <div className="landing-testimonial__stars" aria-label="5 out of 5 stars">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={14} className="text-primary fill-primary/35" aria-hidden="true" />
      ))}
    </div>
    <blockquote className="landing-testimonial__quote">&ldquo;{t.q}&rdquo;</blockquote>
    <footer className="landing-testimonial__author">
      <p className="landing-testimonial__name">{t.n}</p>
      <p className="landing-testimonial__role">{t.r}</p>
    </footer>
  </article>
);

/** Testimonials revolve like the symbol ticker; final CTA without duplicate logo. */
const LandingTrustSection = () => (
  <section
    id="testimonials"
    className="landing-band landing-band--raised landing-trust-section flow-section--divider"
    aria-labelledby="trust-title"
  >
    <div className="landing-trust-section__mesh" aria-hidden="true" />

    <div className="section-shell landing-trust-section__inner">
      <ScrollReveal variant="fade-up">
        <LandingSectionHeader
          eyebrow="Voices"
          eyebrowPill
          title="TRUSTED BY TRADERS"
          titleId="trust-title"
          lead="Prop firms, FX desks, and independent algos on one desk-grade interface."
        />
      </ScrollReveal>

      <div className="landing-testimonials-revolve" role="marquee" aria-label="Trader testimonials">
        <div className="landing-testimonials-revolve__track">
          <div className="landing-testimonials-revolve__strip">
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
              <TestimonialCard key={`${t.n}-${i}`} t={t} />
            ))}
          </div>
        </div>
      </div>

      <div className="landing-final-cta">
        <ScrollReveal variant="fade-up" delay={80}>
          <div className="landing-final-cta__panel">
            <p className="landing-final-cta__eyebrow">Start today</p>
            <h2 className="landing-final-cta__title">READY FOR YOUR EDGE?</h2>
            <p className="landing-final-cta__lead">
              Full platform access for seven days. No commitment until you are convinced.
            </p>
            <Link to="/register" className="btn-primary landing-final-cta__btn group">
              Create Free Account
              <ArrowRight size={22} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </div>
  </section>
);

export default LandingTrustSection;
