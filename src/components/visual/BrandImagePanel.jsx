import React from 'react';
import brandMark from '../../assets/brand/insidr-mark.png';

/**
 * Decorative brand imagery — cropped zones for bear (left) / bull (right) / center.
 */
const BrandImagePanel = ({
  focus = 'center',
  className = '',
  overlay = true,
  hoverLift = true,
}) => {
  const positions = {
    center: 'center 38%',
    bear: '25% 38%',
    bull: '75% 38%',
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border/60 bg-surface ${
        hoverLift ? 'image-panel-hover' : ''
      } ${className}`}
    >
      <img
        src={brandMark}
        alt=""
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-smooth group-hover:scale-105"
        style={{ objectPosition: positions[focus] || positions.center }}
        draggable={false}
      />
      {overlay && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/15 via-transparent to-primary/15" />
          <div className="absolute inset-0 ring-1 ring-inset ring-white/5 rounded-2xl" />
        </>
      )}
    </div>
  );
};

export default BrandImagePanel;
