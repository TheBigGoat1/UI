import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import LazySectionVideo from '../visual/LazySectionVideo';
import ScrollReveal from '../motion/ScrollReveal';
import { LANDING_VIDEOS } from '../../config/landingVideos';

const LandingPlatformBlock = ({ modules }) => (
  <section id="platform" className="landing-band landing-band--raised flow-section--divider landing-market-section">
    <div className="section-shell">
      <ScrollReveal variant="fade-up" className="landing-platform-video landing-platform-video--reveal" aria-labelledby="market-intelligence-title">
        <LazySectionVideo
          src={LANDING_VIDEOS.platform}
          className="landing-platform-video__media"
          dimLevel="cinematic"
          objectPosition="center center"
          playbackRate={0.7}
          eager
        />
        <div className="landing-platform-video__copy">
          <h2 id="market-intelligence-title" className="landing-platform-video__title">
            MARKET INTELLIGENCE
          </h2>
          <p className="landing-platform-video__subtitle">Watch global flow in real time</p>
          <p className="landing-platform-video__lead">
            Price action, sentiment, and regime context in the same rhythm your dashboard runs on.
          </p>
        </div>
      </ScrollReveal>

      <div className="landing-platform__grid">
        {modules.map((m, i) => (
          <ScrollReveal key={m.title} variant="scale" delay={i * 70} className="h-full">
            <article className="landing-module landing-module--interactive h-full min-h-[148px]">
              <div className="landing-module__icon">
                <m.icon className={m.color} size={22} aria-hidden="true" />
              </div>
              <h3 className="landing-module__title">{m.title}</h3>
              <p className="landing-module__desc">{m.desc}</p>
            </article>
          </ScrollReveal>
        ))}
      </div>

      <div className="landing-platform__cta">
        <Link to="/register" className="btn-primary inline-flex px-8 py-3.5">
          Open Dashboard <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  </section>
);

export default LandingPlatformBlock;
