import React from 'react';
import { TrendingDown, CheckCircle2 } from 'lucide-react';
import LazySectionVideo from '../visual/LazySectionVideo';
import LandingSectionHeader from './LandingSectionHeader';
import ScrollReveal from '../motion/ScrollReveal';
import { useTheme } from '../../context/ThemeContext';
import { LANDING_VIDEOS } from '../../config/landingVideos';

const FEATURES = [
  'Multi-timeframe pattern recognition',
  'Per-asset news sentiment scoring',
  'Risk-based position sizing',
];

/** Idea Feed — cinematic video in dark mode; clean solid band in light mode. */
const LandingSignalsSection = () => {
  const { isDark } = useTheme();

  return (
    <section
      id="showcase"
      className={`landing-band flow-section--divider ${
        isDark ? 'landing-band--cinema' : 'landing-band--ideas-light'
      }`}
      aria-labelledby="ideas-showcase-title"
    >
      {isDark && (
        <>
          <LazySectionVideo
            src={LANDING_VIDEOS.signals}
            className="landing-ideas-section__video"
            dimLevel="signals"
            objectPosition="center center"
            playbackRate={0.75}
          />
          <div className="landing-ideas-section__fade landing-ideas-section__fade--top" aria-hidden="true" />
          <div className="landing-ideas-section__fade landing-ideas-section__fade--bottom" aria-hidden="true" />
        </>
      )}

      <div className="section-shell landing-ideas-section__inner">
        <ScrollReveal variant="fade-up">
          <LandingSectionHeader
            eyebrow="IDEA FEED"
            eyebrowPill
            title="PREMIUM IDEAS, DELIVERED"
            titleId="ideas-showcase-title"
            lead="Every setup ships with levels, macro context, and confidence scoring. Not alerts alone."
            className={isDark ? 'landing-section-header--on-video' : ''}
          />
        </ScrollReveal>

        <div className="landing-ideas-grid">
          <ScrollReveal variant="bounce" delay={0} className="h-full">
            <ul className="landing-ideas-features landing-ideas-panel--interactive h-full">
              {FEATURES.map((t) => (
                <li key={t} className="landing-ideas-features__item">
                  <CheckCircle2 className="text-primary shrink-0" size={20} aria-hidden="true" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </ScrollReveal>

          <ScrollReveal variant="bounce" delay={160} className="h-full">
            <article className="landing-idea-card landing-idea-card--elevated landing-ideas-panel--interactive h-full">
              <div className="idea-accent-top" />
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="landing-idea-card__pair">EUR/USD</h3>
                  <span className="text-danger font-bold flex items-center gap-1 text-sm mt-1">
                    <TrendingDown size={16} aria-hidden="true" /> SHORT
                  </span>
                </div>
                <span className="badge-glow animate-glow-pulse">85%</span>
              </div>
              <div className="landing-idea-card__levels">
                {[
                  { l: 'Entry', v: '1.0850', c: 'text-text-main' },
                  { l: 'Target', v: '1.0780', c: 'text-success' },
                  { l: 'Stop', v: '1.0885', c: 'text-danger' },
                ].map((cell) => (
                  <div key={cell.l} className="landing-idea-card__level landing-idea-card__level--lift">
                    <span className="block text-[10px] text-text-muted uppercase font-bold mb-1">{cell.l}</span>
                    <span className={`font-mono font-bold text-sm ${cell.c}`}>{cell.v}</span>
                  </div>
                ))}
              </div>
              <p className="landing-idea-card__rationale">
                ECB and Fed divergence plus 4H 200 EMA rejection align for a high-confluence short.
              </p>
            </article>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};

export default LandingSignalsSection;
