import React from 'react';
import {
  PanelRightClose,
  PanelRightOpen,
  Maximize2,
  Minimize2,
  ChevronsUpDown,
} from 'lucide-react';

/**
 * Expand / collapse desk layout — chart focus, news panel, compact headline.
 */
const MrktDeskControls = ({
  chartExpanded,
  newsOpen,
  headerCompact,
  onToggleChart,
  onToggleNews,
  onToggleHeader,
}) => {
  return (
    <div className="mrkt-desk-controls" role="toolbar" aria-label="Layout">
      <button
        type="button"
        className={`mrkt-desk-controls__btn ${chartExpanded ? 'mrkt-desk-controls__btn--active' : ''}`}
        onClick={onToggleChart}
        title={chartExpanded ? 'Restore split view' : 'Expand chart'}
        aria-pressed={chartExpanded}
      >
        {chartExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        <span className="hidden sm:inline">{chartExpanded ? 'Restore' : 'Expand'}</span>
      </button>

      <button
        type="button"
        className={`mrkt-desk-controls__btn ${newsOpen ? 'mrkt-desk-controls__btn--active' : ''}`}
        onClick={onToggleNews}
        disabled={chartExpanded}
        title={newsOpen ? 'Hide news feed' : 'Show news feed'}
        aria-pressed={newsOpen}
      >
        {newsOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
        <span className="hidden sm:inline">News</span>
      </button>

      <button
        type="button"
        className={`mrkt-desk-controls__btn ${headerCompact ? 'mrkt-desk-controls__btn--active' : ''}`}
        onClick={onToggleHeader}
        title={headerCompact ? 'Expand headline' : 'Compact headline'}
        aria-pressed={headerCompact}
      >
        <ChevronsUpDown size={14} />
        <span className="hidden sm:inline">Headline</span>
      </button>
    </div>
  );
};

export default MrktDeskControls;
