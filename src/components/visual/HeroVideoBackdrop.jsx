import React, { useRef, useEffect } from 'react';

import { LANDING_VIDEOS } from '../../config/landingVideos';

const VIDEO_SRC = LANDING_VIDEOS.hero;
const PLAYBACK_RATE = 0.72;

const HeroVideoBackdrop = ({ className = '' }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.playbackRate = PLAYBACK_RATE;
    el.play().catch(() => {});
  }, []);

  return (
    <div className={`hero-video-wrap pointer-events-none ${className}`} aria-hidden="true">
      <video ref={videoRef} className="hero-video__media" autoPlay muted loop playsInline preload="auto">
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>

      {/* Slight dim over video — chart still visible, copy stays crisp */}
      <div className="absolute inset-0 bg-[#080810]/28" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(8,8,14,0.4) 0%, rgba(8,8,14,0.12) 40%, rgba(8,8,14,0.55) 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 50% 45%, rgba(6, 6, 14, 0.48) 0%, transparent 72%)',
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#080810]/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#080810] to-transparent" />
    </div>
  );
};

export default HeroVideoBackdrop;
