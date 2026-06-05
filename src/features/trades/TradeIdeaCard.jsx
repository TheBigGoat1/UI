import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, LineChart, ArrowRight, X } from 'lucide-react';
import TradeChart from '../../components/TradeChart.jsx';
import { formatTriggerBadge } from '../../utils/ideaDisplay.js';

function fmtPrice(val, asset) {
  const n = parseFloat(val);
  if (Number.isNaN(n)) return '—';
  if (/USD/.test(String(asset)) && n > 50) return n.toFixed(2);
  if (n >= 1000) return n.toFixed(2);
  if (n >= 10) return n.toFixed(4);
  return n.toFixed(5);
}

const TradeIdeaCard = ({
  idea,
  onClick,
  isOpenTrade,
  onCloseTrade,
  closing,
  isWatchlist,
  livePrice,
}) => {
  if (!idea) return null;

  const asset = idea.asset || idea.symbol || 'UNK';
  const direction = idea.direction || (idea.side ? idea.side.toUpperCase() : 'FLAT');
  const confidence = Math.round(Number(idea.confidence || idea.winProbability || 0));
  const isLong =
    direction.toUpperCase().includes('LONG') || direction.toUpperCase().includes('BUY');
  const isFocus = idea.is_todays_focus;
  const triggerInterval = idea.trigger_interval || '15m';

  const rawEntry = idea.entry_price ?? idea.entryPrice ?? idea.price ?? idea.suggested_entry;
  const entry =
    rawEntry != null && !Number.isNaN(Number(rawEntry))
      ? Number(rawEntry)
      : livePrice != null
        ? Number(livePrice)
        : null;
  const target = idea.take_profit ?? idea.takeProfit ?? idea.target;
  const stop = idea.stop_loss ?? idea.stopLoss ?? idea.stop;

  const rr = useMemo(() => {
    const e = entry;
    const t = parseFloat(target);
    const s = parseFloat(stop);
    if (!Number.isFinite(e) || Number.isNaN(t) || Number.isNaN(s)) return null;
    const risk = isLong ? e - s : s - e;
    const reward = isLong ? t - e : e - t;
    if (risk <= 0.00001) return null;
    return (reward / risk).toFixed(1);
  }, [entry, target, stop, isLong]);

  const backtestPreset = {
    symbol: asset,
    interval: triggerInterval,
    minConfidence: Math.max(50, confidence),
    minRR: 1.5,
  };

  return (
    <article
      className={`idea-card ${isLong ? 'idea-card--long' : 'idea-card--short'} ${isFocus ? 'idea-card--focus' : ''}`}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      role="button"
      tabIndex={0}
    >
      <header className="idea-card__head">
        <div>
          <div className="idea-card__symbol">{asset}</div>
          <div className="idea-card__badges">
            <span className={`idea-card__badge ${isLong ? 'idea-card__badge--long' : 'idea-card__badge--short'}`}>
              {direction}
            </span>
            {isFocus && <span className="idea-card__badge idea-card__badge--focus">Focus</span>}
            {!isFocus && isWatchlist && (
              <span className="idea-card__badge idea-card__badge--focus">Watch</span>
            )}
          </div>
        </div>
        <div className="idea-card__conf">
          <div className="idea-card__conf-val">{confidence}%</div>
          <div className="idea-card__conf-label">Conf.</div>
        </div>
      </header>

      <div className="idea-card__chart" onClick={(e) => e.stopPropagation()}>
        <TradeChart
          symbol={asset}
          interval={triggerInterval}
          height={120}
          interactive={false}
          compact
          quotePrice={livePrice}
        />
      </div>

      <div className="idea-card__levels">
        <div className="idea-card__level">
          <span className="idea-card__level-k">Entry</span>
          <span className="idea-card__level-v">{entry != null ? fmtPrice(entry, asset) : '—'}</span>
        </div>
        <div className="idea-card__level">
          <span className="idea-card__level-k">Target</span>
          <span className="idea-card__level-v idea-card__level-v--tp">
            {fmtPrice(target, asset)}
          </span>
        </div>
        <div className="idea-card__level">
          <span className="idea-card__level-k">Stop</span>
          <span className="idea-card__level-v idea-card__level-v--sl">{fmtPrice(stop, asset)}</span>
        </div>
      </div>

      <footer className="idea-card__foot">
        <span className="idea-card__meta">
          {formatTriggerBadge(idea)}
          {rr ? ` · ${rr}R` : ''}
        </span>
        <div className="idea-card__actions">
          {isOpenTrade ? (
            <button
              type="button"
              className="idea-card__close"
              disabled={closing}
              onClick={(e) => {
                e.stopPropagation();
                onCloseTrade?.(idea);
              }}
            >
              <X size={11} aria-hidden /> {closing ? '…' : 'Close'}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="idea-card__action idea-card__action--primary"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick?.();
                }}
              >
                Review <ArrowRight size={11} aria-hidden />
              </button>
              <Link
                to="/dashboard/backtest?tab=strategy"
                state={{ preset: backtestPreset }}
                className="idea-card__action"
                onClick={(e) => e.stopPropagation()}
                title="Strategy backtest"
              >
                <FlaskConical size={11} aria-hidden /> Test
              </Link>
              <Link
                to={`/dashboard?symbol=${encodeURIComponent(asset)}`}
                className="idea-card__action"
                onClick={(e) => e.stopPropagation()}
                title="Open terminal chart"
              >
                <LineChart size={11} aria-hidden /> Chart
              </Link>
            </>
          )}
        </div>
      </footer>
    </article>
  );
};

export default TradeIdeaCard;
