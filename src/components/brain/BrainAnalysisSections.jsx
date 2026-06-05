import React from 'react';
import { CALENDAR_SECTION_LABELS } from '../../utils/brainAnalysis.js';

/** Structured macro release sections — Summary through Trading notes */
const BrainAnalysisSections = ({ sections = {}, fallbackAnalysis = '', compact = false, className = '' }) => {
  const hasSections = CALENDAR_SECTION_LABELS.some(({ key }) => sections[key]);

  if (!hasSections && fallbackAnalysis) {
    return (
      <div className={`brain-sections ${compact ? 'brain-sections--compact' : ''} ${className}`.trim()}>
        <div className="brain-sections__block">
          <h4 className="brain-sections__title">Desk read</h4>
          <p className="brain-sections__body">{fallbackAnalysis}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`brain-sections ${compact ? 'brain-sections--compact' : ''} ${className}`.trim()}>
      {CALENDAR_SECTION_LABELS.map(({ key, title }) => {
        const body = sections[key];
        if (!body) return null;
        return (
          <div key={key} className="brain-sections__block">
            <h4 className="brain-sections__title">{title}</h4>
            <p className="brain-sections__body">{body}</p>
          </div>
        );
      })}
    </div>
  );
};

export default BrainAnalysisSections;
