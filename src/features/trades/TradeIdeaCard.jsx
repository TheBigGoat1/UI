import React, { useEffect, useState } from "react";
import { Clock, X, Zap } from "lucide-react";
import { api } from "../../services/api/api.js";
import TradeChart from "../../components/TradeChart";
import {
  formatConfluence10,
  formatTriggerBadge,
  gradeLabel,
  GRADE_STYLES,
} from "../../utils/ideaDisplay.js";
import { formatIntervalLabel } from "../../utils/chartConfig.js";

const TradeIdeaCard = ({ idea, onClick, isOpenTrade, onCloseTrade, closing }) => {
  if (!idea) return null;

  const [currentMarketPrice, setCurrentMarketPrice] = useState(null);

  useEffect(() => {
    let active = true;
    const symbol = idea.asset || idea.symbol;
    if (!symbol) return undefined;

    api.market
      .getAllPrices()
      .then((res) => {
        if (active && res?.success && res.data?.[symbol]) {
          setCurrentMarketPrice(Number(res.data[symbol].price));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [idea]);

  const asset = idea.asset || idea.symbol || "UNK";
  const isCrypto =
    idea.assetClass === "crypto" ||
    /BTC|ETH|SOL|BNB|XRP|DOGE|ADA|AVAX|LINK|DOT|LTC|ATOM/i.test(asset);
  const direction = idea.direction || (idea.side ? idea.side.toUpperCase() : "FLAT");
  const confidence = Number(idea.confidence || idea.winProbability || 0);
  const rationale = idea.thesis || idea.rationale || idea.analysis || "Technical structure supports this setup.";
  const grade = idea.grade || "B";
  const isFocus = idea.is_todays_focus;

  const rawEntry = idea.entry_price ?? idea.entryPrice ?? idea.price ?? idea.suggested_entry;
  const resolvedEntry =
    rawEntry !== undefined && rawEntry !== null && !Number.isNaN(rawEntry)
      ? parseFloat(rawEntry)
      : currentMarketPrice;

  const entryDisplay = resolvedEntry ? resolvedEntry : "-";
  const target = idea.take_profit ?? idea.takeProfit ?? idea.target ?? "-";
  const stop = idea.stop_loss ?? idea.stopLoss ?? idea.stop ?? "-";

  const rawDate = idea.created_at ?? idea.createdAt ?? idea.timestamp ?? idea.date;
  const created = rawDate ? rawDate : new Date().toISOString();

  const triggerInterval = idea.trigger_interval || "15m";
  const htfTrend = idea.htf_trend || idea.htf?.trend;
  const ltfTrend = idea.ltf_trend || idea.ltf?.trend;
  const alignment = idea.alignment;

  const isLong =
    direction.toUpperCase().includes("LONG") || direction.toUpperCase().includes("BUY");
  const theme = isLong
    ? {
        border: "border-emerald-500/20",
        bg: "bg-emerald-500/5",
        badge: "bg-emerald-500/10 border-emerald-500 text-emerald-500",
      }
    : {
        border: "border-red-500/20",
        bg: "bg-red-500/5",
        badge: "bg-red-500/10 border-red-500 text-red-500",
      };

  const formatDate = (iso) => {
    try {
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return "Just Now";
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "--:--";
    }
  };

  const calculateRR = () => {
    const e = parseFloat(resolvedEntry);
    const t = parseFloat(target);
    const s = parseFloat(stop);
    if (Number.isNaN(e) || Number.isNaN(t) || Number.isNaN(s)) return "N/A";
    let risk = 0;
    let reward = 0;
    if (isLong) {
      risk = e - s;
      reward = t - e;
    } else {
      risk = s - e;
      reward = e - t;
    }
    if (risk <= 0.00001) return "N/A";
    return `1:${(reward / risk).toFixed(2)}`;
  };

  const displayNum = (val) => {
    const num = parseFloat(val);
    return Number.isNaN(num) ? val : num.toFixed(5);
  };

  const trendChipClass = (t) => {
    if (!t) return "text-text-muted";
    if (String(t).includes("BULL")) return "text-emerald-400";
    if (String(t).includes("BEAR")) return "text-red-400";
    return "text-yellow-500";
  };

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      className={`card-modern border ${theme.border} p-0 cursor-pointer group flex flex-col relative overflow-hidden h-full ${isFocus ? "ring-1 ring-primary/40" : ""}`}
    >
      <div className="signal-accent-top" />
      {isFocus && (
        <span className="absolute top-2 left-2 z-10 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/40">
          Today&apos;s focus
        </span>
      )}
      <div className="p-5 pb-2">
        <div className="absolute top-0 right-0 p-4 text-right z-10">
          <div className="flex flex-col items-end">
            <span
              className={`text-2xl font-bold font-mono ${confidence > 80 ? "text-primary" : "text-text-muted"}`}
            >
              {Math.round(confidence)}%
            </span>
            <span className="text-[10px] uppercase text-text-muted font-bold tracking-wider">
              Confidence
            </span>
          </div>
        </div>

        <div className="mb-3 pr-16">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-bold text-xl text-text-main">{asset}</span>
            {isCrypto && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Crypto
              </span>
            )}
            <span
              className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${theme.badge}`}
            >
              {direction}
            </span>
            <span className={GRADE_STYLES[grade] || GRADE_STYLES.WATCH}>
              {gradeLabel(grade)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="idea-trigger-badge">
              <Zap size={10} className="inline -mt-px mr-0.5" />
              {formatTriggerBadge(idea)}
            </span>
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <Clock size={10} /> {formatDate(created)}
            </span>
          </div>
        </div>

        {(htfTrend || ltfTrend) && (
          <div className="flex flex-wrap gap-1.5 mb-2 text-[9px] font-mono font-bold uppercase">
            <span className="px-1.5 py-0.5 rounded border border-border/80 bg-background/50">
              Chart {formatIntervalLabel(triggerInterval)}{" "}
              <span className={trendChipClass(ltfTrend)}>{ltfTrend || "—"}</span>
            </span>
            {htfTrend && (
              <span className="px-1.5 py-0.5 rounded border border-border/80 bg-background/50">
                Structure <span className={trendChipClass(htfTrend)}>{htfTrend}</span>
              </span>
            )}
            {alignment === "CONFLICTING" && (
              <span className="px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-400 bg-amber-500/10">
                Divergence
              </span>
            )}
          </div>
        )}

        <div className="h-32 w-full mb-4 border border-border/50 rounded-lg overflow-hidden relative bg-background/30">
          <TradeChart
            symbol={asset}
            interval={triggerInterval}
            height={128}
            interactive={false}
            compact
            className="!min-h-[128px]"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-background/60 p-1.5 rounded-lg border border-border/80 text-center relative">
            <span className="text-[9px] text-text-muted uppercase block mb-0.5">Entry</span>
            <span className="font-mono font-bold text-xs text-text-main">
              {!rawEntry && currentMarketPrice && (
                <span
                  className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"
                  title="Market price"
                />
              )}
              {displayNum(entryDisplay)}
            </span>
          </div>
          <div className="bg-background/60 p-1.5 rounded-lg border border-border/80 text-center">
            <span className="text-[9px] text-text-muted uppercase block mb-0.5">Target</span>
            <span className="font-mono font-bold text-xs text-emerald-500">{displayNum(target)}</span>
          </div>
          <div className="bg-background/60 p-1.5 rounded-lg border border-border/80 text-center">
            <span className="text-[9px] text-text-muted uppercase block mb-0.5">Stop Loss</span>
            <span className="font-mono font-bold text-xs text-red-500">{displayNum(stop)}</span>
          </div>
        </div>

        {idea.event_gate?.nextEvent && (
          <p className="text-[10px] text-amber-300/90 mb-2 border border-amber-500/25 rounded px-2 py-1">
            Macro: {idea.event_gate.nextEvent.name} in {idea.event_gate.minutesUntil}m
          </p>
        )}
        {idea.invalidation_text && (
          <p className="text-[10px] text-red-400/90 mb-1 line-clamp-2">{idea.invalidation_text}</p>
        )}
        {idea.time_stop && (
          <p className="text-[10px] text-text-muted mb-2 line-clamp-1">{idea.time_stop}</p>
        )}
        <p className="text-xs text-text-muted line-clamp-3 leading-relaxed mb-2">
          <span className="font-bold text-text-main opacity-50 mr-1">Thesis:</span>
          {rationale}
        </p>
      </div>

      <div
        className={`mt-auto pt-2 border-t border-border flex justify-between items-center gap-2 ${theme.bg} px-5 py-2`}
      >
        {isOpenTrade ? (
          <>
            <span className="text-[10px] font-bold uppercase text-emerald-500">Open position</span>
            <button
              type="button"
              disabled={closing}
              onClick={(e) => {
                e.stopPropagation();
                onCloseTrade?.(idea);
              }}
              className="px-3 py-1 text-[10px] font-bold uppercase rounded bg-red-500/90 hover:bg-red-600 text-white disabled:opacity-50 flex items-center gap-1"
            >
              <X size={12} /> {closing ? "Closing…" : "Close"}
            </button>
          </>
        ) : (
          <>
            <div className="flex flex-col">
              <span className="text-[9px] text-text-muted uppercase">R:R</span>
              <span className="font-bold font-mono text-xs text-text-main">{calculateRR()}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-text-muted uppercase">Confluence</span>
              <span className="font-bold text-xs text-primary" title="Score out of 10">
                {formatConfluence10(idea)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TradeIdeaCard;
