import React from 'react';

/**
 * Shared ambient backdrop — same tone from landing → auth → dashboard.
 */
const AppFlowShell = ({ children, className = '' }) => (
  <div className={`flow-page page-mesh ${className}`.trim()}>
    <div className="page-grid" aria-hidden="true" />
    <div className="flow-page__content">{children}</div>
  </div>
);

export default AppFlowShell;
