import React from 'react';
import ErrorBoundary from './ErrorBoundary.jsx';

/**
 * Isolates failures to a dashboard section so the rest of the terminal keeps running.
 */
const SectionErrorBoundary = ({ title, message, children }) => {
  const [retryKey, setRetryKey] = React.useState(0);

  return (
    <ErrorBoundary
      key={retryKey}
      title={title}
      message={message}
      className="mrkt-section-error"
      onRetry={() => setRetryKey((k) => k + 1)}
    >
      {children}
    </ErrorBoundary>
  );
};

export default SectionErrorBoundary;
