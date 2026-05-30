import React, { useState, useEffect } from 'react';
import AppNavbar from './AppNavbar';
import LiveTickerBar from './LiveTickerBar';

/** Fixed nav + live ticker — stays visible while scrolling the landing page */
const LandingChrome = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={`landing-chrome ${scrolled ? 'landing-chrome--scrolled' : ''}`}
      id="landing-chrome"
    >
      <AppNavbar overlay inChrome scrolled={scrolled} />
      <LiveTickerBar />
    </div>
  );
};

export default LandingChrome;
