import React from 'react';
import brandMark from '../../assets/brand/insidr-mark.png';

/**
 * Bull/bear brand atmosphere — center-cropped, vignetted for clean UI overlay.
 */
const HeroBackdrop = ({ variant = 'hero', className = '' }) => {
  const isSubtle = variant === 'subtle';
  const isBold = variant === 'bold';

  return (
    <div
      className={`hero-backdrop pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <div
        className="hero-backdrop__art absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: `url(${brandMark})`,
          backgroundPosition: 'center 38%',
          backgroundSize: isSubtle ? 'cover' : 'cover',
          opacity: isBold ? 0.7 : isSubtle ? 0.2 : 0.48,
          filter: isSubtle ? 'blur(1px)' : 'none',
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-r from-secondary/30 via-background/20 to-primary/25 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/70 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_65%_at_50%_38%,transparent_0%,rgba(8,8,16,0.5)_45%,rgba(8,8,16,0.97)_100%)]" />
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:56px_56px]" />
    </div>
  );
};

export default HeroBackdrop;
