import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, FlaskConical, LineChart, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../../services/api/api.js';
import TradeChart from '../../components/TradeChart.jsx';
import { formatTriggerBadge } from '../../utils/ideaDisplay.js';
import { THESIS_TAGS } from '../../utils/thesisTags.js';

const IdeaDetailModal = ({ isOpen, onClose, idea, livePrice, onTradeClosed, onAccepted }) => {
  const [interval, setInterval] = useState('15m');
  const [tradeStatus, setTradeStatus] = useState('idle');
  const [activeTradeId, setActiveTradeId] = useState(null);
  const [tradeError, setTradeError] = useState(null);
  const [tradeNotice, setTradeNotice] = useState(null);
  const [planAgreed, setPlanAgreed] = useState(false);
  const [thesisTag, setThesisTag] = useState('plan');
  const [closeThesisTag, setCloseThesisTag] = useState('plan');
  const [sizePreview, setSizePreview] = useState(null);

  useEffect(() => {
    if (!idea) return;
    setTradeError(null);
    setTradeNotice(null);
    setPlanAgreed(false);
    setThesisTag('plan');
    setCloseThesisTag('plan');
    const posId = idea.trade_id || idea.position_id;
    if (posId || idea.position_status === 'open' || idea.status === 'open') {
      setActiveTradeId(posId);
      setTradeStatus('active');
    } else {
      setActiveTradeId(null);
      setTradeStatus('idle');
    }
    setInterval(idea.trigger_interval || '15m');
  }, [idea, isOpen]);

  useEffect(() => {
    if (!isOpen || !idea?.id) return undefined;
    let active = true;
    api.trader
      .sizePreview(idea.id)
      .then((res) => {
        if (active && res?.success) setSizePreview(res.data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isOpen, idea?.id]);

  if (!isOpen || !idea) return null;

  const asset = idea.asset || idea.symbol;
  const isLong = (idea.direction || '').toUpperCase().includes('LONG');
  const badgeClass = isLong ? 'idea-card__badge--long' : 'idea-card__badge--short';

  const levels = [
    { price: idea.entry_price, type: 'ENTRY', label: 'Entry' },
    { price: idea.take_profit, type: 'SUPPORT', label: 'Target' },
    { price: idea.stop_loss, type: 'RESISTANCE', label: 'Stop' },
  ];

  const backtestPreset = {
    symbol: asset,
    interval: idea.trigger_interval || interval,
    minConfidence: Math.max(50, Math.round(Number(idea.confidence || 0))),
    minRR: 1.5,
  };

  const handleTradeAction = async () => {
    setTradeError(null);
    setTradeNotice(null);
    setTradeStatus('loading');
    try {
      if (!activeTradeId) {
        if (!idea?.id) throw new Error('Invalid idea — refresh and try again.');
        if (!planAgreed) {
          throw new Error('Confirm you agree with the thesis and invalidation before accepting.');
        }

        const res = await api.trades.accept(idea.id, {
          position_size: sizePreview?.size?.units,
          plan_agreed: true,
          thesis_tag: thesisTag,
          risk_percent_used: sizePreview?.profile?.risk_percent_per_trade,
        });

        if (res?.success && res.data) {
          const pid = res.data.positionId || res.data.id;
          setActiveTradeId(pid);
          setTradeStatus('active');
          setTradeNotice(res.data.sizePreview?.note || 'Trade accepted — tracked in Journal.');
          onAccepted?.();
        } else if (res?.status === 409 || res?.data?.id) {
          setActiveTradeId(res.data?.id || res.data?.positionId);
          setTradeStatus('active');
          setTradeError(res.error || 'Position already open.');
        } else {
          throw new Error(res?.error || 'Failed to accept trade');
        }
      } else {
        const currentPrice = Number(livePrice ?? idea.entry_price ?? 0);
        const res = await api.trades.close(activeTradeId, currentPrice, planAgreed, closeThesisTag);
        if (res?.success) {
          setTradeStatus('closed');
          const pnl = Number(res.data?.pnl);
          if (!Number.isNaN(pnl)) {
            setTradeNotice(`Closed · P&L ${pnl >= 0 ? '+' : ''}$${Math.abs(pnl).toFixed(2)}`);
          }
          setTimeout(() => onTradeClosed?.(), 900);
        } else {
          throw new Error(res.error || 'Failed to close trade');
        }
      }
    } catch (err) {
      setTradeError(err?.error || err?.message || 'Trade action failed');
      setTradeStatus(activeTradeId ? 'active' : 'idle');
    }
  };

  return (
    <div className="idea-drawer" role="dialog" aria-modal="true" aria-labelledby="idea-drawer-title" onClick={onClose}>
      <div className="idea-drawer__panel" onClick={(e) => e.stopPropagation()}>
        <header className="idea-drawer__head">
          <div className="idea-drawer__title-row">
            <h2 id="idea-drawer-title" className="idea-drawer__title">
              {asset}
            </h2>
            <span className={`idea-card__badge ${badgeClass}`}>{idea.direction}</span>
            <span className="idea-card__conf-val" style={{ fontSize: '1rem' }}>
              {Math.round(idea.confidence || 0)}%
            </span>
          </div>
          <button type="button" onClick={onClose} className="ideas-lab__btn ideas-lab__btn--ghost" aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="idea-drawer__body">
          <div className="idea-drawer__chart-col">
            <div className="idea-drawer__chart-toolbar">
              <span className="ideas-lab__rail-label">{formatTriggerBadge(idea)}</span>
              <select
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                className="dash-select !py-1 !text-xs !pr-7"
                aria-label="Chart interval"
              >
                <option value="15m">15m</option>
                <option value="1h">1H</option>
                <option value="4h">4H</option>
                <option value="1day">1D</option>
              </select>
            </div>
            <div className="idea-drawer__chart-stage">
              <TradeChart
                symbol={asset}
                interval={interval}
                levels={levels}
                fill
                interactive
                quotePrice={livePrice}
              />
            </div>
          </div>

          <aside className="idea-drawer__side">
            <div className="idea-drawer__levels-grid">
              <div className="idea-card__level">
                <span className="idea-card__level-k">Entry</span>
                <span className="idea-card__level-v">{idea.entry_price ?? '—'}</span>
              </div>
              <div className="idea-card__level">
                <span className="idea-card__level-k">Target</span>
                <span className="idea-card__level-v idea-card__level-v--tp">{idea.take_profit ?? '—'}</span>
              </div>
              <div className="idea-card__level">
                <span className="idea-card__level-k">Stop</span>
                <span className="idea-card__level-v idea-card__level-v--sl">{idea.stop_loss ?? '—'}</span>
              </div>
            </div>

            <p className="idea-drawer__thesis">{idea.thesis || idea.rationale || 'No thesis text.'}</p>
            {idea.invalidation_text && (
              <p className="idea-drawer__invalid">Invalidation: {idea.invalidation_text}</p>
            )}

            <div className="idea-drawer__links">
              <Link
                to="/dashboard/backtest?tab=strategy"
                state={{ preset: backtestPreset }}
                className="idea-drawer__link"
              >
                <FlaskConical size={14} aria-hidden /> Strategy backtest
              </Link>
              <Link
                to="/dashboard/backtest?tab=fundamentals"
                className="idea-drawer__link"
              >
                <FlaskConical size={14} aria-hidden /> Fundamentals
              </Link>
              <Link
                to={`/dashboard?symbol=${encodeURIComponent(asset)}`}
                className="idea-drawer__link"
              >
                <LineChart size={14} aria-hidden /> Terminal chart
              </Link>
            </div>

            {!activeTradeId && tradeStatus !== 'closed' && (
              <div className="idea-drawer__plan">
                <label>
                  <input
                    type="checkbox"
                    checked={planAgreed}
                    onChange={(e) => setPlanAgreed(e.target.checked)}
                  />
                  I agree with thesis &amp; invalidation — decision support, not advice.
                </label>
                <div className="ideas-lab__pills" style={{ marginTop: '0.5rem' }}>
                  {THESIS_TAGS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`ideas-lab__pill ${thesisTag === t.id ? 'is-active' : ''}`}
                      onClick={() => setThesisTag(t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTradeId && tradeStatus === 'active' && (
              <div className="idea-drawer__plan">
                <label>
                  <input
                    type="checkbox"
                    checked={planAgreed}
                    onChange={(e) => setPlanAgreed(e.target.checked)}
                  />
                  I followed the plan at close
                </label>
                <div className="ideas-lab__pills" style={{ marginTop: '0.5rem' }}>
                  {THESIS_TAGS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`ideas-lab__pill ${closeThesisTag === t.id ? 'is-active' : ''}`}
                      onClick={() => setCloseThesisTag(t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sizePreview?.size?.note && (
              <p className="ideas-lab__notice ideas-lab__notice--info">{sizePreview.size.note}</p>
            )}
          </aside>
        </div>

        <footer className="idea-drawer__foot">
          {tradeNotice && (
            <span className="idea-drawer__status idea-drawer__status--ok">
              <CheckCircle size={14} aria-hidden /> {tradeNotice}
            </span>
          )}
          {tradeError && !tradeNotice && (
            <span className="idea-drawer__status idea-drawer__status--err">
              <AlertCircle size={14} aria-hidden /> {tradeError}
            </span>
          )}
          <div className="idea-drawer__foot-actions">
            <button type="button" className="ideas-lab__btn ideas-lab__btn--ghost" onClick={onClose}>
              Dismiss
            </button>
            <button
              type="button"
              className={`ideas-lab__btn ${tradeStatus === 'active' ? 'ideas-lab__btn--ghost' : 'ideas-lab__btn--primary'}`}
              style={tradeStatus === 'active' ? { color: '#f87171', borderColor: 'rgba(248,113,113,0.4)' } : undefined}
              onClick={handleTradeAction}
              disabled={tradeStatus === 'loading' || tradeStatus === 'closed'}
            >
              {tradeStatus === 'loading'
                ? 'Processing…'
                : tradeStatus === 'active'
                  ? 'Close trade'
                  : tradeStatus === 'closed'
                    ? 'Closed'
                    : 'Accept trade'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default IdeaDetailModal;
