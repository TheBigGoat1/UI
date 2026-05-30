import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import LazySectionVideo from '../visual/LazySectionVideo';
import { LANDING_VIDEOS } from '../../config/landingVideos';

const LandingPlatformBlock = ({ modules }) => (
  <section className="landing-band landing-band--raised flow-section--divider landing-section--balanced" id="platform">
    <div className="section-shell">
      <div className="landing-platform-stack">
        <div className="landing-intel">
          <div className="landing-intel__frame landing-surface">
            <div className="landing-intel__media" aria-hidden="true">
              <LazySectionVideo
                src={LANDING_VIDEOS.platform}
                className="landing-intel__video-panel"
                dimLevel="none"
                objectPosition="center 42%"
                playbackRate={0.7}
                eager
              />
            </div>

            <div className="landing-intel__gradient" aria-hidden="true" />

            <header className="landing-intel__content">
              <p className="landing-intel__eyebrow">Platform</p>
              <h2 id="market-intelligence-title" className="landing-intel__title">
                Market intelligence
              </h2>
              <p className="landing-intel__lead">
                Watch global flow in motion — then explore the same modules inside your dashboard.
              </p>
            </header>
          </div>
        </div>

        <div className="landing-grid landing-grid--3 landing-platform__modules">
          {modules.map((m) => (
            <article key={m.title} className="landing-module landing-surface">
              <div className="landing-module__icon">
                <m.icon size={20} aria-hidden="true" />
              </div>
              <h3 className="landing-module__title">{m.title}</h3>
              <p className="landing-module__desc">{m.desc}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="text-center landing-platform__cta">
        <Link to="/register" className="btn-primary inline-flex px-8 py-3.5 gap-2">
          Open dashboard
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  </section>
);

export default LandingPlatformBlock;
