import React from 'react';

/** Atmospheric page backdrop — same asset as landing */
const AuthBackdrop = () => (
  <div className="auth-screen__backdrop" aria-hidden="true">
    <img
      src="/landing-hero.jpg"
      alt=""
      className="auth-screen__backdrop-image"
      loading="eager"
      fetchPriority="high"
    />
    <div className="auth-screen__backdrop-dim" />
    <div className="auth-screen__backdrop-grid" />
  </div>
);

export default AuthBackdrop;
