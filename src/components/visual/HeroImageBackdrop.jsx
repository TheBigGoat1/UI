import React from 'react';

/** Full-bleed hero backdrop — trader terminal photo */
const HeroImageBackdrop = ({ className = '' }) => (
  <div className={`hero-video-wrap pointer-events-none ${className}`} aria-hidden="true">
    <img
      src="/landing-hero.jpg"
      alt=""
      className="hero-video__media hero-video__media--image"
      loading="eager"
      fetchPriority="high"
    />
    <div className="hero-overlay hero-overlay--base" />
    <div className="hero-overlay hero-overlay--vignette" />
    <div className="hero-overlay hero-overlay--theme" />
  </div>
);

export default HeroImageBackdrop;
