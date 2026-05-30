import React from 'react';

const LandingSection = ({ id, children, ariaLabelledBy, className = '' }) => (
  <section
    id={id}
    className={`landing-section ${className}`.trim()}
    aria-labelledby={ariaLabelledBy}
  >
    <div className="landing-wrap">{children}</div>
  </section>
);

export default LandingSection;
