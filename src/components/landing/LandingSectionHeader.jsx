import React from 'react';

const LandingSectionHeader = ({
  eyebrow,
  title,
  lead,
  align = 'center',
  eyebrowPill = false,
  titleId,
  className = '',
}) => (
  <header
    className={`landing-section-header ${align === 'left' ? 'landing-section-header--left' : ''} ${className}`}
  >
    {eyebrow && (
      <p
        className={
          eyebrowPill
            ? 'landing-section-header__eyebrow landing-section-header__eyebrow--pill'
            : 'landing-section-header__eyebrow'
        }
      >
        {eyebrow}
      </p>
    )}
    <h2 id={titleId} className="landing-section-header__title">
      {title}
    </h2>
    {lead && <p className="landing-section-header__lead">{lead}</p>}
  </header>
);

export default LandingSectionHeader;
