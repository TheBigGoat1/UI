import React from 'react';

/** Consistent left-aligned section header — single reading direction across landing */
const LandingSectionHead = ({ eyebrow, title, titleId, lead, className = '' }) => (
  <header className={`landing-section__head ${className}`.trim()}>
    {eyebrow ? <p className="landing-section__eyebrow">{eyebrow}</p> : null}
    <h2 id={titleId} className="landing-section__title">
      {title}
    </h2>
    {lead ? <p className="landing-section__lead">{lead}</p> : null}
  </header>
);

export default LandingSectionHead;
