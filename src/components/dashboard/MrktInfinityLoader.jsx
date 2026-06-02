import React from 'react';

/** MRKT-style infinity loading dots */
const MrktInfinityLoader = ({ label = 'Analyzing market impact…' }) => (
  <div className="mrkt-infinity-loader" role="status" aria-live="polite">
    <svg className="mrkt-infinity-loader__svg" viewBox="0 0 120 40" aria-hidden>
      <path
        className="mrkt-infinity-loader__path mrkt-infinity-loader__path--a"
        d="M20 20 C20 8 40 8 40 20 C40 32 60 32 60 20 C60 8 80 8 80 20 C80 32 100 32 100 20"
        fill="none"
        strokeWidth="3"
      />
    </svg>
    <span className="mrkt-infinity-loader__label">{label}</span>
  </div>
);

export default MrktInfinityLoader;
