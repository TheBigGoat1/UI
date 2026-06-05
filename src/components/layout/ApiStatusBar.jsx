import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Server } from 'lucide-react';
import { api } from '../../services/api/api.js';

/** Shown when the Express API is not reachable (dev proxy or direct port). */
const ApiStatusBar = ({ className = '' }) => {
  const [online, setOnline] = useState(true);
  const [staleApi, setStaleApi] = useState(false);
  const [checking, setChecking] = useState(false);

  const check = async () => {
    setChecking(true);
    try {
      const res = await api.system.getHealth();
      const ok = !!res?.success;
      setOnline(ok);
      if (ok) {
        const trader = await api.trader.ping();
        setStaleApi(!trader?.success || trader?.status === 404);
      } else {
        setStaleApi(false);
      }
    } catch {
      setOnline(false);
      setStaleApi(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    check();
    const id = setInterval(check, 20000);
    return () => clearInterval(id);
  }, []);

  if (online && !staleApi) return null;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-100">
            {staleApi ? 'API is outdated — restart required' : 'API offline — data cannot load'}
          </p>
          <p className="text-amber-200/80 text-xs mt-1 leading-relaxed">
            {staleApi ? (
              <>
                The server is running an old build without watchlist / event-gate routes. Stop all Node
                processes, then run{' '}
                <code className="px-1.5 py-0.5 rounded bg-black/30 font-mono text-[11px]">
                  npm run dev:all
                </code>{' '}
                and hard-refresh the browser.
              </>
            ) : (
              <>
                Start both servers from the project folder:{' '}
                <code className="px-1.5 py-0.5 rounded bg-black/30 font-mono text-[11px]">
                  npm run dev:all
                </code>
                . Set <code className="font-mono text-[11px]">PORT</code> and{' '}
                <code className="font-mono text-[11px]">VITE_API_URL</code> in .env to the same port
                (default 3003).
              </>
            )}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={check}
        disabled={checking}
        className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-2 shrink-0 self-start sm:self-center"
      >
        <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
        Retry connection
      </button>
    </div>
  );
};

export default ApiStatusBar;
