const TV_SCRIPT = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';

let warmPromise = null;

/**
 * Warm the TradingView script cache via preload only — never execute the embed
 * script from <head> (that runs without widget JSON and throws parse errors).
 */
export function warmTradingViewScript() {
  if (typeof document === 'undefined') return Promise.resolve();
  if (warmPromise) return warmPromise;

  warmPromise = Promise.resolve();
  const existing = document.querySelector(`link[rel="preload"][href="${TV_SCRIPT}"]`);
  if (!existing) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = TV_SCRIPT;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }

  return warmPromise;
}

export { TV_SCRIPT };
