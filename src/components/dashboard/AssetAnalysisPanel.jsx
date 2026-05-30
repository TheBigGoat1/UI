import React from 'react';
import {
  BarChart2,
  Globe,
  Info,
  RefreshCw,
  TrendingUp,
  Activity,
  Target,
  AlertTriangle,
  Zap,
  ArrowLeftRight,
  Layers,
} from 'lucide-react';
import { formatIntervalLabel } from '../../utils/chartConfig.js';

function biasColor(value) {
  if (!value || typeof value !== 'string') return 'text-text-muted';
  const v = value.toUpperCase();
  if (v.includes('BULL')) return 'text-emerald-500';
  if (v.includes('BEAR')) return 'text-red-500';
  return 'text-yellow-500';
}

function formatLevel(price, symbol) {
  const n = Number(price);
  if (!Number.isFinite(n)) return '—';
  if (symbol?.includes('JPY')) return n.toFixed(2);
  if (symbol?.includes('BTC') || n > 5000) return n.toFixed(0);
  if (n > 100) return n.toFixed(2);
  return n.toFixed(4);
}

function alignmentClass(alignment) {
  if (alignment === 'ALIGNED') return 'tf-structure--aligned';
  if (alignment === 'CONFLICTING') return 'tf-structure--conflict';
  return 'tf-structure--mixed';
}

function TrendPill({ label, trend, sublabel, pending }) {
  const t = pending ? '…' : trend || 'NEUTRAL';
  return (
    <div className="tf-trend-pill">
      <span className="tf-trend-pill__tag">{label}</span>
      <span className="tf-trend-pill__sub">{sublabel}</span>
      <span className={`tf-trend-pill__value ${biasColor(t)}`}>{t}</span>
    </div>
  );
}

const AssetAnalysisPanel = ({
  symbol,
  interval = '4h',
  period = '1M',
  risk,
  analysisState,
}) => {
  const { technical, timeframe, profile, meta, loading, error, refresh } = analysisState;

  const ms = technical?.modules?.marketStructure;
  const htf = ms?.htf?.trend;
  const ltf = ms?.ltf?.trend;
  const htfLabel = ms?.htf?.label || timeframe?.htfLabel || 'Higher TF';
  const ltfLabel = ms?.ltf?.label || timeframe?.chartLabel || `${formatIntervalLabel(interval)} · ${period}`;
  const alignment = ms?.alignment;
  const rsi = technical?.modules?.momentum?.rsi;
  const momentum = technical?.modules?.momentum?.state;
  const vol = technical?.modules?.volatility;
  const levels = technical?.modules?.levels;
  const bias = technical?.bias;
  const rawConfidence = technical?.confidence;
  const summary = technical?.summary;
  const dataQuality = meta?.dataQuality || 'pending';
  const isPending = dataQuality === 'pending' || dataQuality === 'waiting';
  const isLive = dataQuality === 'live';
  const isModel = dataQuality === 'synthetic' || dataQuality === 'model' || dataQuality === 'fallback';

  const showSkeleton = loading && isPending;
  const isStale = loading && !isPending && technical;
  const showError = error && isPending && !technical?.modules;
  const confidenceDisplay =
    rawConfidence != null && !isPending ? `${Math.round(rawConfidence)}%` : '—';
  const confidenceWidth =
    rawConfidence != null && !isPending ? Math.min(100, Math.max(0, rawConfidence)) : 0;

  if (!symbol) {
    return (
      <aside className="dash-market-analysis p-5 lg:p-6">
        <p className="text-sm text-text-muted italic text-center py-8">
          Select an asset to view analysis.
        </p>
      </aside>
    );
  }

  return (
    <aside className="dash-market-analysis p-5 lg:p-6">
      <div className="flex items-center justify-between mb-4 gap-2">
        <h3 className="font-display font-bold text-lg text-text-main flex items-center gap-2">
          <BarChart2 size={20} className="text-primary shrink-0" />
          Analysis
        </h3>
        <div className="flex items-center gap-2">
          {dataQuality && (
            <span
              className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                isLive
                  ? 'border-emerald-500/40 text-emerald-500'
                  : isModel
                    ? 'border-amber-500/40 text-amber-400'
                    : isPending
                      ? 'border-border text-text-muted'
                      : 'border-primary/40 text-primary'
              }`}
            >
              {isLive ? 'live' : isModel ? 'model data' : isPending ? 'syncing' : dataQuality}
            </span>
          )}
          <span className="badge-glow text-[10px]">{symbol}</span>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="p-1.5 rounded-lg border border-border text-text-muted hover:text-primary hover:border-primary/40 transition-colors disabled:opacity-50"
            title="Refresh analysis"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {showError && (
        <div className="mb-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-200 flex gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <div>
            <p>{error}</p>
            <button type="button" onClick={refresh} className="text-primary font-bold mt-1 hover:underline">
              Retry
            </button>
          </div>
        </div>
      )}

      {isModel && !loading && (
        <p className="text-[10px] text-amber-300/90 mb-2 border border-amber-500/25 rounded px-2 py-1 bg-amber-500/5">
          Model OHLC (rate-limited or offline feed) — levels are structural estimates, not live quotes.
        </p>
      )}

      {isStale && (
        <p className="text-[10px] text-text-muted mb-2 animate-pulse flex items-center gap-1">
          <Layers size={10} /> Recalculating {formatIntervalLabel(interval)} · {period}…
        </p>
      )}

      <p className="text-[10px] text-text-muted mb-3 flex items-center gap-1.5 border-b border-border/40 pb-2">
        <ArrowLeftRight size={11} className="text-primary shrink-0" />
        Analysis follows your chart — each timeframe has its own read
      </p>

      <div className={`space-y-4 flex-1 ${showSkeleton ? 'opacity-60 pointer-events-none' : ''}`}>
        {/* Bias + confidence */}
        <div className="bg-background border border-border rounded-lg p-3">
          <div className="flex justify-between items-start gap-2 mb-2">
            <span className="text-[10px] uppercase text-text-muted font-bold tracking-wider">
              Overall bias
            </span>
            <span className={`text-xs font-bold uppercase ${biasColor(bias)}`}>
              {showSkeleton ? '…' : isPending ? '—' : bias || 'neutral'}
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface overflow-hidden mb-2">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${confidenceWidth}%` }}
            />
          </div>
          <p className="text-[10px] text-text-muted font-mono">
            Confidence {confidenceDisplay}
            {alignment && !isPending ? ` · ${alignment.replace(/_/g, ' ')}` : ''}
            {isLive ? ' · live feed' : isModel ? ' · model bars' : isPending ? ' · awaiting feed' : ''}
          </p>
        </div>

        {/* Multi-timeframe structure */}
        <div className={`tf-structure rounded-xl p-3 border ${alignmentClass(alignment)}`}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted flex items-center gap-1">
              <TrendingUp size={12} className="text-primary" /> Multi-timeframe
            </span>
            {alignment && !showSkeleton && (
              <span className={`tf-align-badge tf-align-badge--${alignment.toLowerCase()}`}>
                {alignment === 'ALIGNED' && '✓ In sync'}
                {alignment === 'CONFLICTING' && '⚡ Divergence'}
                {alignment === 'MIXED' && '~ Mixed'}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2">
            <TrendPill label="Higher TF" trend={htf} sublabel={htfLabel} pending={isPending} />
            <div className="tf-structure__vs" aria-hidden>
              <span>vs</span>
            </div>
            <TrendPill label="Your chart" trend={ltf} sublabel={ltfLabel} pending={isPending} />
          </div>
          {alignment === 'CONFLICTING' && !showSkeleton && (
            <p className="text-[10px] text-amber-300/90 mt-2 leading-snug">
              Higher and chart timeframes disagree — common before breakouts. Wait for alignment or
              trade the pullback with tight risk.
            </p>
          )}
        </div>

        {/* Momentum + volatility */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-background border border-border rounded-lg p-3">
            <div className="flex items-center gap-1 text-[10px] text-text-muted mb-1 uppercase font-bold">
              <Activity size={11} /> RSI
            </div>
            <p className="font-mono font-bold text-sm">
              {isPending ? '…' : rsi != null ? rsi : '—'}
              <span className="text-[10px] text-text-muted font-normal ml-1">
                {momentum ? momentum.toLowerCase() : ''}
              </span>
            </p>
          </div>
          <div className="bg-background border border-border rounded-lg p-3">
            <div className="flex items-center gap-1 text-[10px] text-text-muted mb-1 uppercase font-bold">
              <Target size={11} /> Volatility
            </div>
            <p className="font-mono font-bold text-sm">
              {showSkeleton ? '—' : vol?.state || 'NORMAL'}
              {vol?.atrPct != null && (
                <span className="text-[10px] text-text-muted font-normal block">
                  ATR {vol.atrPct}%
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Key levels */}
        <div className="bg-background border border-border rounded-lg p-3">
          <div className="text-[10px] text-text-muted uppercase font-bold mb-2">
            Key levels · {formatIntervalLabel(interval)}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div>
              <span className="text-[9px] text-emerald-500 block">Support</span>
              <span className="font-bold">{formatLevel(levels?.support, symbol)}</span>
            </div>
            <div>
              <span className="text-[9px] text-text-muted block">Last</span>
              <span className="font-bold">{formatLevel(levels?.last, symbol)}</span>
            </div>
            <div>
              <span className="text-[9px] text-red-400 block">Resistance</span>
              <span className="font-bold">{formatLevel(levels?.resistance, symbol)}</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <p className="text-xs text-text-muted leading-relaxed border-l-2 border-primary/40 pl-3">
            {summary}
          </p>
        )}

        {/* Macro risk tie-in */}
        {risk?.environment && (
          <div className="bg-background border border-border rounded-lg p-3">
            <div className="text-[10px] text-text-muted uppercase font-bold mb-1">Macro regime</div>
            <p className="text-xs font-bold text-text-main">
              {risk.environment.replace(/_/g, ' ')}
            </p>
            <p className="text-[10px] text-text-muted mt-1">{risk.interpretation}</p>
          </div>
        )}

        {/* Profile */}
        <div>
          <h4 className="text-xs text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
            <Info size={12} /> Behavior profile
          </h4>
          <p className="text-sm text-text-muted leading-relaxed">
            {profile?.typical_behaviour || 'Profile unavailable for this asset.'}
          </p>
        </div>

        <div className="space-y-2">
          <div className="bg-background border border-border rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
              <Globe size={12} /> Key regions
            </div>
            <div className="font-mono text-sm font-bold">
              {profile?.key_drivers?.countries?.join(' · ') || '—'}
            </div>
          </div>
          <div className="bg-background border border-border rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
              <Zap size={12} /> Correlation
            </div>
            <div className="font-mono text-sm font-bold text-text-main">
              + {profile?.correlations?.positive?.slice(0, 2).join(', ') || '—'}
            </div>
          </div>
        </div>

        {meta?.asOf && (
          <p className="text-[9px] text-text-muted font-mono text-right">
            Updated {new Date(meta.asOf).toLocaleTimeString()}
          </p>
        )}
      </div>
    </aside>
  );
};

export default AssetAnalysisPanel;
