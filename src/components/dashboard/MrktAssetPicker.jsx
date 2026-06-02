import React from 'react';
import { X } from 'lucide-react';

const MrktAssetPicker = ({ assets, prices, selected, onSelect, onClose }) => {
  const list =
    assets?.length > 0
      ? assets.map((a) => (typeof a === 'string' ? a : a.asset))
      : ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD'];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-[#0a0a0a] shadow-2xl animate-fade-in max-h-[60vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="text-sm font-bold text-white">Select instrument</h3>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-white p-1">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto custom-scrollbar p-2 grid grid-cols-2 gap-1">
          {list.map((sym) => {
            const p = prices?.[sym];
            const up = (p?.changePercent ?? 0) >= 0;
            return (
              <button
                key={sym}
                type="button"
                onClick={() => {
                  onSelect(sym);
                  onClose();
                }}
                className={`text-left px-3 py-2.5 rounded-lg border transition-all ${
                  selected === sym
                    ? 'border-[#8b5cf6]/50 bg-[#8b5cf6]/10 text-white'
                    : 'border-white/5 hover:border-white/15 text-text-muted hover:text-white'
                }`}
              >
                <span className="text-xs font-bold block">{sym}</span>
                {p?.price != null && (
                  <span className={`text-[10px] font-mono ${up ? 'text-emerald-500' : 'text-red-500'}`}>
                    {Number(p.price).toFixed(sym.includes('JPY') ? 2 : 4)}{' '}
                    ({up ? '+' : ''}
                    {Number(p.changePercent || 0).toFixed(2)}%)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MrktAssetPicker;
