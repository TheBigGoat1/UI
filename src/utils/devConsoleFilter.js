/**
 * Suppress console noise injected by browser extensions (MetaMask, wallet scripts,
 * content scripts) and TradingView iframe — not emitted by this application.
 */
function flattenConsoleArgs(args) {
  return args
    .map((a) => {
      if (typeof a === 'string') return a;
      if (a?.message) return `${a.message} ${a.stack || ''}`;
      if (a?.stack) return a.stack;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(' ');
}

function isExtensionConsoleNoise(args) {
  const text = flattenConsoleArgs(args);
  return (
    /contentscript\.js/i.test(text) ||
    /MaxListenersExceededWarning/i.test(text) ||
    /inpage\.js/i.test(text) ||
    /MetaMask extension not found/i.test(text) ||
    /Failed to connect to MetaMask/i.test(text) ||
    /Error restoring session/i.test(text) ||
    /Receiving end does not exist/i.test(text) ||
    /runtime\.lastError/i.test(text) ||
    /Widget settings parse error/i.test(text) ||
    /Invalid settings provided, fall back to defaults/i.test(text) ||
    (import.meta.env.DEV && /Download the React DevTools/i.test(text))
  );
}

function isExtensionRejection(reason) {
  const text = String(reason?.message || reason?.stack || reason || '');
  return /MetaMask|inpage\.js|Failed to connect to MetaMask/i.test(text);
}

export function installExtensionConsoleFilter() {
  if (typeof window === 'undefined' || window.__insidrConsoleFilter) return;
  window.__insidrConsoleFilter = true;

  ['warn', 'error', 'info'].forEach((level) => {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      if (isExtensionConsoleNoise(args)) return;
      original(...args);
    };
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (isExtensionRejection(event.reason)) {
      event.preventDefault();
    }
  });
}
