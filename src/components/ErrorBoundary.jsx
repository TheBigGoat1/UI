import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleRetry = () => {
    this.setState({ error: null });
    if (this.props.onRetry) this.props.onRetry();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const wrapperClass = [
      'flex items-center justify-center p-6',
      this.props.className ? this.props.className : 'min-h-[240px]',
    ].join(' ');

    return (
      <div className={wrapperClass}>
        <div className="max-w-md w-full rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center space-y-4">
          <AlertTriangle size={32} className="mx-auto text-red-400" />
          <div>
            <h2 className="font-display font-bold text-lg text-text-main mb-1">
              {this.props.title || 'Something went wrong'}
            </h2>
            <p className="text-sm text-text-muted">
              {this.props.message ||
                'This section hit an unexpected error. Try refreshing or navigate away and back.'}
            </p>
            {import.meta.env.DEV && (
              <p className="text-xs font-mono text-red-300/80 mt-2 break-all">{error.message}</p>
            )}
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            <button
              type="button"
              onClick={this.handleRetry}
              className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
            >
              <RefreshCw size={14} /> Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm rounded-lg border border-border text-text-muted hover:text-text-main"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
