import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatPrice, formatChangePercent } from '../../utils/displayFormat.js';

/**
 * Inline symbol dropdown — no modal overlay.
 */
const MrktAssetDropdown = ({ symbol, assets = [], prices = {}, onSelect }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const list = useMemo(() => {
    const fromAssets = (assets || [])
      .map((a) => (typeof a === 'string' ? a : a.asset || a.symbol))
      .filter(Boolean)
      .map((s) => String(s).toUpperCase());

    const fromPrices = Object.keys(prices || {})
      .map((s) => String(s).toUpperCase().replace(/^C:/, ''))
      .filter((s) => /^[A-Z0-9]{3,12}$/.test(s));

    const merged = [...new Set([...fromAssets, ...fromPrices])].sort((a, b) => a.localeCompare(b));
    if (merged.length) return merged;

    return ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD', 'US500', 'NAS100'];
  }, [assets, prices]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (sym) => {
    onSelect?.(String(sym).toUpperCase());
    setOpen(false);
  };

  return (
    <div className="mrkt-asset-dropdown" ref={rootRef}>
      <button
        type="button"
        className="mrkt-chart-toolbar__asset-select mrkt-asset-dropdown__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Symbol ${symbol}. Open list`}
      >
        {symbol}
        <ChevronDown size={14} className={`mrkt-asset-dropdown__chev ${open ? 'is-open' : ''}`} />
      </button>
      {open && (
        <div className="mrkt-asset-dropdown__menu custom-scrollbar" role="listbox" aria-label="Instruments">
          {list.map((sym) => {
            const p = prices[sym] || prices[`C:${sym}`];
            const ch = Number(p?.changePercent);
            const up = Number.isFinite(ch) && ch >= 0;
            const active = sym === symbol;
            return (
              <button
                key={sym}
                type="button"
                role="option"
                aria-selected={active}
                className={`mrkt-asset-dropdown__item ${active ? 'mrkt-asset-dropdown__item--active' : ''}`}
                onClick={() => pick(sym)}
              >
                <span className="mrkt-asset-dropdown__sym">{sym}</span>
                <span className={`mrkt-asset-dropdown__px ${up ? 'up' : 'down'}`}>
                  {formatPrice(p?.price, sym)}
                  {Number.isFinite(ch) && (
                    <span className="mrkt-asset-dropdown__ch">{formatChangePercent(ch)}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MrktAssetDropdown;
