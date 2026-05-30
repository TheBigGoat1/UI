import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Server } from 'lucide-react';
import { api } from '../../services/api/api.js';

/**
 * Shown when the Express API is not reachable (port 3001 / dev proxy).
 */
const ApiStatusBar = ({ className = '' }) => {
  const [online, setOnline] = useState(true);
  const [checking, setChecking] = useState(false);

  const check = async () => {
    setChecking(true);
    try {
      const res = await api.system.getHealth();
      setOnline(!!res?.success);
    } catch {
      setOnline(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    check();
    const id = setInterval(check, 20000);
    return () => clearInterval(id);
  }, []);

  if (online) return null;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-100">API offline — data cannot load</p>
          <p className="text-amber-200/80 text-xs mt-1 leading-relaxed">
            Start both servers from the project folder:{' '}
            <code className="px-1.5 py-0.5 rounded bg-black/30 font-mono text-[11px]">
              npm run dev:all
            </code>
            . The API runs on port <strong>3001</strong>, the app on <strong>5173</strong>.
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
