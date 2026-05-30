import React from 'react';
import { useAssetAnalysis } from '../../hooks/useAssetAnalysis.js';

const chipClass = (kind) => {
  if (kind === 'bull') return 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10';
  if (kind === 'bear') return 'border-red-500/40 text-red-400 bg-red-500/10';
  return 'border-border text-text-muted bg-surface';
};

const trendKind = (t) => {
  const v = String(t || '').toUpperCase();
  if (v.includes('BULL')) return 'bull';
  if (v.includes('BEAR')) return 'bear';
  return 'neutral';
};

const CompactAnalysisBar = ({ symbol }) => {
  const { technical, loading } = useAssetAnalysis(symbol);

  if (!symbol) return null;

  const htf = technical?.modules?.marketStructure?.htf?.trend;
  const ltf = technical?.modules?.marketStructure?.ltf?.trend;
  const bias = technical?.bias;
  const rsi = technical?.modules?.momentum?.rsi;

  return (
    <div className="flex flex-wrap gap-2 px-4 py-2 border-t border-border/30 bg-surface/30">
      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${chipClass(trendKind(bias))}`}>
        {loading && !bias ? '…' : `Bias ${bias || 'neutral'}`}
      </span>
      <span className={`text-[10px] font-mono px-2 py-1 rounded border ${chipClass(trendKind(htf))}`}>
        HTF {loading && !htf ? '…' : htf || 'NEUTRAL'}
      </span>
      <span className={`text-[10px] font-mono px-2 py-1 rounded border ${chipClass(trendKind(ltf))}`}>
        LTF {loading && !ltf ? '…' : ltf || 'NEUTRAL'}
      </span>
      <span className="text-[10px] font-mono px-2 py-1 rounded border border-border text-text-muted bg-surface">
        RSI {loading && rsi == null ? '…' : rsi ?? '—'}
      </span>
      {technical?.confidence != null && (
        <span className="text-[10px] font-mono px-2 py-1 rounded border border-primary/30 text-primary bg-primary/10">
          {technical.confidence}% conf
        </span>
      )}
    </div>
  );
};

export default CompactAnalysisBar;
