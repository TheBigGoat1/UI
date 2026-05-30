import React from 'react';
import { useLandingScrollSpy } from '../../hooks/useLandingScrollSpy';

/** Top scroll progress only — no side dot rail */
const LandingScrollProgress = () => {
  const { progress } = useLandingScrollSpy();

  return (
    <div
      className="landing-progress"
      role="progressbar"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page scroll progress"
    >
      <div className="landing-progress__bar" style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
};

export default LandingScrollProgress;
