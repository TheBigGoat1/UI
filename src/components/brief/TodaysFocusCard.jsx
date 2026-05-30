import React from 'react';
import { Crosshair, ChevronRight } from 'lucide-react';
import { formatConfluence10, formatTriggerBadge, gradeLabel, GRADE_STYLES } from '../../utils/ideaDisplay.js';

const TodaysFocusCard = ({ idea, onOpen }) => {
  if (!idea) {
    return (
      <div className="focus-card focus-card--empty">
        <Crosshair size={20} className="text-text-muted" />
        <p>No A-grade focus — review Watch list or regenerate after session momentum.</p>
      </div>
    );
  }

  const dir = idea.direction || 'FLAT';
  const isLong = String(dir).includes('LONG');

  return (
    <button
      type="button"
      className="focus-card"
      onClick={() => onOpen?.(idea)}
    >
      <div className="focus-card__badge-row">
        <span className="focus-card__label">
          <Crosshair size={14} /> Today&apos;s focus
        </span>
        <span className={GRADE_STYLES[idea.grade] || GRADE_STYLES.WATCH}>
          {gradeLabel(idea.grade)}
        </span>
      </div>
      <div className="focus-card__main">
        <span className="focus-card__symbol">{idea.asset}</span>
        <span className={`focus-card__dir ${isLong ? 'text-emerald-400' : 'text-red-400'}`}>
          {dir}
        </span>
        <span className="focus-card__conf">{Math.round(idea.confidence)}%</span>
      </div>
      <p className="focus-card__thesis">{idea.thesis || idea.rationale}</p>
      <div className="focus-card__meta">
        <span>{formatTriggerBadge(idea)}</span>
        <span>Confluence {formatConfluence10(idea)}</span>
      </div>
      {idea.invalidation_text && (
        <p className="focus-card__invalid">{idea.invalidation_text}</p>
      )}
      <span className="focus-card__cta">
        Open setup <ChevronRight size={14} />
      </span>
    </button>
  );
};

export default TodaysFocusCard;
