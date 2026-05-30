import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  X,
  Activity,
  BarChart2,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Maximize2,
  FlaskConical,
} from "lucide-react";
import { api } from "../../services/api/api.js";
import TradeChart from "../../components/TradeChart";
import CompactAnalysisBar from "../../components/dashboard/CompactAnalysisBar";
import { DEFAULT_CHART, periodToInterval } from "../../utils/chartConfig.js";
import {
  formatConfluence10,
  formatTriggerBadge,
  gradeLabel,
  GRADE_STYLES,
} from "../../utils/ideaDisplay.js";
import { THESIS_TAGS } from "../../utils/thesisTags.js";

const IdeaDetailModal = ({ isOpen, onClose, idea, onTradeClosed, onAccepted }) => {
  const [lastPrice, setLastPrice] = useState(null);
  const [interval, setInterval] = useState(DEFAULT_CHART.interval);
  const [period, setPeriod] = useState(DEFAULT_CHART.period);
  const [tradeStatus, setTradeStatus] = useState("idle");
  const [activeTradeId, setActiveTradeId] = useState(null);
  const [tradeError, setTradeError] = useState(null);
  const [tradeNotice, setTradeNotice] = useState(null);
  const [planAgreed, setPlanAgreed] = useState(false);
  const [thesisTag, setThesisTag] = useState("plan");
  const [closeThesisTag, setCloseThesisTag] = useState("plan");
  const [sizePreview, setSizePreview] = useState(null);
  const [setupStats, setSetupStats] = useState(null);

  useEffect(() => {
    if (!idea) return;
    setTradeError(null);
    setTradeNotice(null);
    setPlanAgreed(false);
    setThesisTag("plan");
    setCloseThesisTag("plan");
    const posId = idea.trade_id || idea.position_id;
    if (posId || idea.position_status === "open" || idea.status === "open") {
      setActiveTradeId(posId);
      setTradeStatus("active");
    } else {
      setActiveTradeId(null);
      setTradeStatus("idle");
    }
    const triggerIv = idea.trigger_interval || "15m";
    setInterval(triggerIv);
  }, [idea, isOpen]);

  useEffect(() => {
    setInterval(periodToInterval(period));
  }, [period]);

  useEffect(() => {
    if (!isOpen || !idea?.id) return;
    let active = true;
    api.trader
      .sizePreview(idea.id)
      .then((res) => {
        if (active && res?.success) setSizePreview(res.data);
      })
      .catch(() => {});
    api.trader
      .getSetupStats(idea.asset)
      .then((res) => {
        if (active && res?.success) setSetupStats(res.data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isOpen, idea?.id, idea?.asset]);

  useEffect(() => {
    if (!isOpen || !idea?.asset) return;
    let active = true;
    api.market
      .getAllPrices()
      .then((res) => {
        if (active && res?.success && res.data?.[idea.asset]) {
          setLastPrice(Number(res.data[idea.asset].price));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isOpen, idea?.asset]);

  if (!isOpen || !idea) return null;

  const isLong = (idea.direction || "").toUpperCase().includes("LONG");
  const badgeClass = isLong
    ? "bg-emerald-500/10 border-emerald-500 text-emerald-500"
    : "bg-red-500/10 border-red-500 text-red-500";
  const grade = idea.grade || "B";

  const levels = [
    { price: idea.entry_price, type: "ENTRY", label: "Entry" },
    { price: idea.take_profit, type: "SUPPORT", label: "Target" },
    { price: idea.stop_loss, type: "RESISTANCE", label: "Stop" },
  ];

  const handleTradeAction = async () => {
    setTradeError(null);
    setTradeNotice(null);
    setTradeStatus("loading");
    try {
      if (!activeTradeId) {
        if (!idea?.id) throw new Error("Invalid idea — refresh and try again");
        if (!planAgreed) {
          throw new Error("Confirm you agree with the thesis and invalidation before accepting.");
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
          setTradeStatus("active");
          if (res.data.sizePreview?.note) {
            setTradeNotice(res.data.sizePreview.note);
          } else {
            setTradeNotice("Trade accepted — tracked in Journal and Open trades.");
          }
          onAccepted?.();
        } else if (res?.status === 409 || res?.data?.id) {
          const pid = res.data?.id || res.data?.positionId;
          if (pid) setActiveTradeId(pid);
          setTradeStatus("active");
          setTradeError(res.error || "Position was already open.");
        } else {
          throw new Error(res?.error || "Failed to accept trade");
        }
      } else {
        const currentPrice = Number(
          lastPrice ?? idea.entry_price ?? idea.entryPrice ?? 0,
        );
        const res = await api.trades.close(activeTradeId, currentPrice, planAgreed, closeThesisTag);

        if (res?.success) {
          setTradeStatus("closed");
          const pnl = Number(res.data?.pnl);
          if (!Number.isNaN(pnl)) {
            setTradeNotice(
              `Closed · P&L ${pnl >= 0 ? "+" : ""}$${Math.abs(pnl).toFixed(2)} · saved to Journal`,
            );
          }
          setTimeout(() => onTradeClosed?.(), 1000);
        } else {
          throw new Error(res.error || "Failed to close trade");
        }
      }
    } catch (err) {
      const msg =
        err?.error ||
        err?.message ||
        (typeof err === "string" ? err : "Trade action failed");
      setTradeError(msg);
      setTradeStatus(activeTradeId ? "active" : "idle");
    }
  };

  const backtestDefaults = {
    symbol: idea.asset,
    interval: idea.trigger_interval || "15m",
    period: "1M",
    minConfidence: 65,
    minRR: 1.5,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f111a] border border-border w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-border bg-surface/50 sticky top-0 backdrop-blur-md z-10">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-text-main">{idea.asset}</h2>
              <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded border ${badgeClass}`}>
                {idea.direction}
              </span>
              <span className={GRADE_STYLES[grade] || GRADE_STYLES.WATCH}>
                {gradeLabel(grade)}
              </span>
              {idea.is_todays_focus && (
                <span className="text-[10px] font-bold uppercase text-primary">Today&apos;s focus</span>
              )}
            </div>
            <div className="text-xs text-text-muted mt-1 flex flex-wrap gap-3">
              <span>
                Confidence{" "}
                <span className={idea.confidence > 70 ? "text-primary font-bold" : ""}>
                  {idea.confidence}%
                </span>
              </span>
              <span>Confluence {formatConfluence10(idea)}</span>
              <span>{formatTriggerBadge(idea)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-surface rounded-full transition-colors text-text-muted hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="w-full bg-surface/30 rounded-lg border border-border/50 relative overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-surface/50">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase text-text-muted font-bold tracking-wider">
                    Interval
                  </span>
                  <select
                    value={interval}
                    onChange={(e) => setInterval(e.target.value)}
                    className="dash-select !py-1.5 !text-xs !pr-8"
                  >
                    <option value="15m">15 Min</option>
                    <option value="1h">1 Hour</option>
                    <option value="4h">4 Hours</option>
                    <option value="1day">1 Day</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase text-text-muted font-bold tracking-wider">
                    Period
                  </span>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="dash-select !py-1.5 !text-xs !pr-8"
                  >
                    <option value="1W">1 Week</option>
                    <option value="1M">1 Month</option>
                    <option value="3M">3 Months</option>
                    <option value="1Y">1 Year</option>
                  </select>
                </div>
              </div>
              <button type="button" className="text-text-muted hover:text-white transition-colors">
                <Maximize2 size={14} />
              </button>
            </div>
            <div className="h-[380px] relative">
              <TradeChart
                symbol={idea.asset}
                interval={interval}
                levels={levels}
                height={380}
                interactive
              />
            </div>
            <CompactAnalysisBar symbol={idea.asset} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-lg bg-surface border border-border space-y-2">
              <h3 className="text-sm font-bold text-text-main">Veteran brief</h3>
              <p className="text-sm text-text-muted">{idea.thesis || idea.rationale}</p>
              {idea.setup_type && (
                <p className="text-xs text-primary font-mono">{idea.setup_type}</p>
              )}
              {idea.invalidation_text && (
                <p className="text-xs text-red-400">{idea.invalidation_text}</p>
              )}
              {idea.time_stop && <p className="text-xs text-text-muted">{idea.time_stop}</p>}
              {(idea.veteran_bullets || []).map((b, i) => (
                <p key={i} className="text-[11px] text-text-muted border-l border-border pl-2">
                  {b}
                </p>
              ))}
            </div>
            <div className="p-5 rounded-lg bg-surface border border-border space-y-3">
              <h3 className="text-sm font-bold text-text-main">Your edge data</h3>
              {setupStats?.note && (
                <p className="text-xs text-text-muted">{setupStats.note}</p>
              )}
              {sizePreview?.heat && (
                <p
                  className={`text-xs ${sizePreview.heat.overHeat ? "text-amber-400" : "text-text-muted"}`}
                >
                  Book heat: {sizePreview.heat.heatPercent}% / {sizePreview.heat.maxHeatPercent}%
                  {sizePreview.heat.atPositionCap ? " · at position cap" : ""}
                </p>
              )}
              {sizePreview?.size?.note && (
                <p className="text-xs text-emerald-400/90">{sizePreview.size.note}</p>
              )}
              <Link
                to="/dashboard/backtest"
                state={{ preset: backtestDefaults }}
                className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
              >
                <FlaskConical size={14} /> Run backtest on this symbol
              </Link>
            </div>
          </div>

          {!activeTradeId && tradeStatus !== "closed" && (
            <div className="accept-plan-panel">
              <p className="font-bold text-text-main text-xs uppercase tracking-wider">
                Before you accept
              </p>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={planAgreed}
                  onChange={(e) => setPlanAgreed(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-text-muted text-xs leading-relaxed">
                  I agree with the thesis, invalidation, and risk on this card — this is decision
                  support, not guaranteed profit.
                </span>
              </label>
              <div>
                <span className="text-[10px] uppercase text-text-muted font-bold">Mindset tag</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {THESIS_TAGS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setThesisTag(t.id)}
                      className={`text-[10px] px-2 py-1 rounded border ${
                        thesisTag === t.id
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-text-muted"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTradeId && tradeStatus === "active" && (
            <div className="accept-plan-panel space-y-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-text-muted">
                <input
                  type="checkbox"
                  checked={planAgreed}
                  onChange={(e) => setPlanAgreed(e.target.checked)}
                />
                I followed the plan (invalidation respected)
              </label>
              <div>
                <span className="text-[10px] uppercase text-text-muted font-bold">
                  Mindset at close
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {THESIS_TAGS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setCloseThesisTag(t.id)}
                      className={`text-[10px] px-2 py-1 rounded border ${
                        closeThesisTag === t.id
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-text-muted"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border bg-surface/50 mt-auto flex justify-between items-center sticky bottom-0 backdrop-blur-md">
          <div className="text-sm font-medium flex items-center gap-2 max-w-md">
            {tradeNotice && (
              <span className="text-emerald-400 flex items-center gap-2">
                <CheckCircle size={16} /> {tradeNotice}
              </span>
            )}
            {tradeError && !tradeNotice && (
              <span className="text-red-400 flex items-center gap-2">
                <AlertCircle size={16} /> {tradeError}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-text-muted hover:text-white transition-colors"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={handleTradeAction}
              disabled={tradeStatus === "loading" || tradeStatus === "closed"}
              className={`px-6 py-2 text-white text-sm font-bold rounded flex items-center gap-2 transition-colors shadow-lg ${
                tradeStatus === "active"
                  ? "bg-red-500 hover:bg-red-600 shadow-red-500/20"
                  : tradeStatus === "closed"
                    ? "bg-surface border border-border text-text-muted opacity-70 cursor-not-allowed"
                    : "bg-primary hover:bg-blue-600 shadow-primary/20"
              }`}
            >
              {tradeStatus === "loading"
                ? "Processing..."
                : tradeStatus === "active"
                  ? "Close trade"
                  : tradeStatus === "closed"
                    ? "Trade closed"
                    : "Accept with plan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdeaDetailModal;
