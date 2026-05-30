import React, { useEffect, useState } from 'react';
import { ListPlus, Loader2, Star, X } from 'lucide-react';
import { api } from '../../services/api/api.js';

const QUICK_PICKS = ['EURUSD', 'GBPUSD', 'XAUUSD', 'BTCUSD', 'ETHUSD', 'US500'];

const WatchlistPanel = () => {
  const [symbols, setSymbols] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const loadWatchlist = async () => {
    setLoading(true);
    try {
      const res = await api.trader.getWatchlist();
      if (res?.success && Array.isArray(res.data)) {
        setSymbols(res.data.map((row) => row.symbol || row));
      }
    } catch {
      setSymbols([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWatchlist();
  }, []);

  const addSymbol = async (raw) => {
    const symbol = String(raw || input)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    if (!symbol || symbols.includes(symbol)) {
      setInput('');
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const res = await api.trader.addToWatchlist(symbol);
      if (res?.success && Array.isArray(res.data)) {
        setSymbols(res.data.map((row) => row.symbol || row));
        setInput('');
        setMessage(`${symbol} added — Overview and News will prioritize it.`);
      } else {
        setMessage(res?.error || 'Could not add symbol.');
      }
    } catch (err) {
      setMessage(err?.error || 'Could not add symbol.');
    } finally {
      setBusy(false);
      setTimeout(() => setMessage(null), 3500);
    }
  };

  const removeSymbol = async (symbol) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.trader.removeFromWatchlist(symbol);
      if (res?.success && Array.isArray(res.data)) {
        setSymbols(res.data.map((row) => row.symbol || row));
      } else {
        setMessage(res?.error || 'Could not remove symbol.');
      }
    } catch (err) {
      setMessage(err?.error || 'Could not remove symbol.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h2 className="font-semibold text-text-main flex items-center gap-2 mb-2">
        <Star size={18} className="text-amber-400" />
        Watchlist
      </h2>
      <p className="text-xs text-text-muted mb-4">
        Your first symbol becomes the default on Overview and News. Set during onboarding or edit here.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addSymbol();
            }
          }}
          placeholder="e.g. BTCUSD"
          className="dash-input flex-1 min-w-[140px] max-w-xs font-mono uppercase"
          disabled={busy}
        />
        <button
          type="button"
          onClick={() => addSymbol()}
          disabled={busy || !input.trim()}
          className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-2"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <ListPlus size={14} />}
          Add
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_PICKS.map((pick) => (
          <button
            key={pick}
            type="button"
            disabled={busy || symbols.includes(pick)}
            onClick={() => addSymbol(pick)}
            className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border border-border text-text-muted hover:text-primary hover:border-primary/40 disabled:opacity-40"
          >
            + {pick}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-text-muted flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Loading watchlist…
        </p>
      ) : symbols.length ? (
        <div className="flex flex-wrap gap-2">
          {symbols.map((symbol, index) => (
            <span
              key={symbol}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-bold ${
                index === 0
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border bg-background/40 text-text-main'
              }`}
            >
              {index === 0 && (
                <span className="text-[8px] uppercase tracking-wider opacity-80">Default</span>
              )}
              {symbol}
              <button
                type="button"
                onClick={() => removeSymbol(symbol)}
                disabled={busy}
                className="p-0.5 rounded hover:bg-surface-hover text-text-muted hover:text-red-400"
                aria-label={`Remove ${symbol}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted">
          No symbols yet. Add at least one to personalize Overview and News.
        </p>
      )}

      {message && (
        <p className="text-xs text-emerald-400 mt-3 border border-emerald-500/30 bg-emerald-500/10 rounded-lg px-3 py-2">
          {message}
        </p>
      )}
    </section>
  );
};

export default WatchlistPanel;
