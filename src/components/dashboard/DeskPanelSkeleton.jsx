import React from 'react';

/** Loading skeleton for desk intelligence tabs */
const DeskPanelSkeleton = ({ rows = 3, variant = 'cards' }) => {
  if (variant === 'gauge') {
    return (
      <div className="desk-skeleton desk-skeleton--gauge" aria-hidden>
        <div className="desk-skeleton__arc" />
        <div className="desk-skeleton__lines">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="desk-skeleton__line" style={{ width: `${70 - i * 8}%` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="desk-skeleton" aria-label="Loading desk data">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="desk-skeleton__row">
          <div className="desk-skeleton__bar" style={{ width: `${55 + (i % 3) * 12}%` }} />
          <div className="desk-skeleton__bar desk-skeleton__bar--short" />
        </div>
      ))}
    </div>
  );
};

export default DeskPanelSkeleton;
