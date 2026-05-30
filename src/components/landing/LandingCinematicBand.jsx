import React from 'react';
import LazySectionVideo from '../visual/LazySectionVideo';

/**
 * Market intelligence band — sits between stats and platform; blends into page flow.
 */
const LandingCinematicBand = ({
  src,
  eyebrow,
  title,
  lead,
  objectPosition = 'center center',
  playbackRate = 0.7,
}) => (
  <section className="landing-cinematic" aria-label={title}>
    <div className="landing-cinematic__fade landing-cinematic__fade--top" aria-hidden="true" />
    <LazySectionVideo
      src={src}
      className="landing-cinematic__video"
      dimLevel="cinematic"
      objectPosition={objectPosition}
      playbackRate={playbackRate}
    />
    <div className="landing-cinematic__fade landing-cinematic__fade--bottom" aria-hidden="true" />
    <div className="landing-cinematic__content section-shell">
      {eyebrow && <p className="landing-cinematic__eyebrow">{eyebrow}</p>}
      <h2 className="landing-cinematic__title">{title}</h2>
      {lead && <p className="landing-cinematic__lead">{lead}</p>}
    </div>
  </section>
);

export default LandingCinematicBand;
