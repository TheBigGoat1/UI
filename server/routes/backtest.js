import { Router } from "express";
import { getHistoryForRange, getSyntheticHistoryForRange } from "../services/marketData.js";
import { analyzeBars } from "../services/technical.js";
import { getAssetMeta } from "../config/assets.js";
import { isBinanceAsset } from "../services/binance.js";
import { optionalAuth, requireBacktestAccess } from "../middleware/backtestAccess.js";

const router = Router();

function barUnix(bar) {
  const t = bar.time;
  return t > 1e12 ? Math.floor(t / 1000) : t;
}

function horizonBars(interval) {
  const map = { "15m": 8, "5m": 12, "1h": 6, "4h": 6, "1day": 4, "1week": 3 };
  return map[interval] || 6;
}

function warmupBars(interval) {
  const map = { "15m": 40, "5m": 50, "1h": 30, "4h": 26, "1day": 22, "1week": 16 };
  return map[interval] || 26;
}

async function loadBacktestBars(symbol, interval, startDate, endDate) {
  const meta = getAssetMeta(symbol);
  let bars = [];
  let dataSource = "synthetic";

  try {
    bars = await getHistoryForRange(symbol, interval, startDate, endDate);
    if (bars.length >= 30) {
      dataSource = meta
        ? isBinanceAsset(meta)
          ? "binance"
          : "yahoo/twelve"
        : "live";
    }
  } catch (err) {
    console.warn("[backtest] history error:", symbol, err.message);
  }

  if (bars.length < 30) {
    bars = getSyntheticHistoryForRange(symbol, interval, startDate, endDate);
    dataSource = "synthetic";
  }

  return { bars, dataSource, meta };
}

function runWalkForward(bars, interval, minConf, rr) {
  const warmup = warmupBars(interval);
  const horizon = horizonBars(interval);
  let correct = 0;
  let total = 0;
  const trades = [];
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;

  for (let i = warmup; i < bars.length - horizon; i += 1) {
    const slice = bars.slice(i - warmup, i);
    let tech;
    try {
      tech = analyzeBars(slice);
    } catch {
      continue;
    }
    if (!tech || tech.bias === "neutral" || (tech.confidence ?? 0) < minConf) continue;

    const entryBar = bars[i];
    const exitBar = bars[i + horizon];
    const entry = Number(entryBar.close);
    const exit = Number(exitBar.close);
    const move = exit - entry;
    const win =
      tech.bias === "bullish" ? move > 0 : tech.bias === "bearish" ? move < 0 : false;

    total += 1;
    if (win) correct += 1;

    const pnlR = win ? rr : -1;
    equity += pnlR;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);

    trades.push({
      date: new Date(barUnix(exitBar) * 1000).toISOString().slice(0, 10),
      entryTime: new Date(barUnix(entryBar) * 1000).toISOString(),
      bias: tech.bias,
      confidence: tech.confidence,
      alignment: tech.alignment,
      entry: Number(entry.toFixed(5)),
      exit: Number(exit.toFixed(5)),
      movePct: entry ? Number(((move / entry) * 100).toFixed(3)) : 0,
      result: win ? "win" : "loss",
      rMultiple: win ? rr : -1,
    });
  }

  const winRate = total > 0 ? correct / total : 0;
  const grossWins = correct * rr;
  const grossLosses = total - correct;

  return {
    warmup,
    horizon,
    total,
    correct,
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    expectancy: total > 0 ? (winRate * rr - (1 - winRate)).toFixed(2) : "0.00",
    profitFactor:
      grossLosses > 0
        ? Number((grossWins / grossLosses).toFixed(2))
        : grossWins > 0
          ? 99
          : 0,
    maxDrawdownR: Number(maxDrawdown.toFixed(2)),
    trades: trades.slice(-100),
    signalsEvaluated: Math.max(0, bars.length - warmup - horizon),
  };
}

function buildPayload(symbol, startDate, endDate, interval, bars, dataSource, meta, sim, rr) {
  const rateLimited = dataSource === "synthetic";
  let message = null;
  if (sim.total === 0) {
    message =
      "No signals met your confidence threshold. Lower min confidence or change timeframe.";
  } else if (rateLimited) {
    message =
      "Ran on model OHLC (live feed rate-limited). Crypto pairs use Binance for best fidelity.";
  }

  return {
    asset: symbol,
    start_date: startDate,
    end_date: endDate,
    interval,
    total: sim.total,
    correct: sim.correct,
    accuracy: sim.accuracy,
    expectancy: sim.expectancy,
    profitFactor: sim.profitFactor,
    maxDrawdownR: sim.maxDrawdownR,
    riskReward: rr,
    trades: sim.trades,
    message,
    barsUsed: bars.length,
    signalsEvaluated: sim.signalsEvaluated,
    dataSource,
    assetClass: meta?.class || "forex",
  };
}

router.post("/run", optionalAuth, requireBacktestAccess, async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const {
    assets = ["EURUSD"],
    start_date,
    end_date,
    interval = "4h",
    min_confidence = 40,
    risk_reward = 2,
  } = body;

  const symbol = String(assets[0] || "EURUSD")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const startDate = start_date || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const endDate = end_date || new Date().toISOString().slice(0, 10);
  const rr = Math.max(1, Number(risk_reward) || 2);
  const minConf = Number(min_confidence) || 40;

  if (new Date(startDate) > new Date(endDate)) {
    return res.status(400).json({
      success: false,
      error: "Start date must be before end date.",
    });
  }

  try {
    let { bars, dataSource, meta } = await loadBacktestBars(symbol, interval, startDate, endDate);
    const warmup = warmupBars(interval);
    const horizon = horizonBars(interval);

    if (bars.length < warmup + horizon + 5) {
      bars = getSyntheticHistoryForRange(symbol, interval, startDate, endDate);
      dataSource = "synthetic";
    }

    if (bars.length < warmup + horizon + 5) {
      return res.json({
        success: true,
        data: {
          asset: symbol,
          start_date: startDate,
          end_date: endDate,
          interval,
          total: 0,
          correct: 0,
          accuracy: 0,
          trades: [],
          message:
            "Not enough bars in range. Widen the date range or switch to 4h / 1day interval.",
          barsUsed: bars.length,
          dataSource,
        },
      });
    }

    const sim = runWalkForward(bars, interval, minConf, rr);
    return res.json({
      success: true,
      data: buildPayload(symbol, startDate, endDate, interval, bars, dataSource, meta, sim, rr),
    });
  } catch (error) {
    console.warn("[backtest] degraded run:", error.message);
    try {
      const meta = getAssetMeta(symbol);
      const bars = getSyntheticHistoryForRange(symbol, interval, startDate, endDate);
      const sim = runWalkForward(bars, interval, minConf, rr);
      return res.json({
        success: true,
        data: {
          ...buildPayload(symbol, startDate, endDate, interval, bars, "synthetic", meta, sim, rr),
          message:
            "Live market data was rate-limited — results use model OHLC. Retry in a minute for live history.",
        },
      });
    } catch (fallbackErr) {
      console.error("[backtest] fallback failed:", fallbackErr.message);
      return res.json({
        success: true,
        data: {
          asset: symbol,
          start_date: startDate,
          end_date: endDate,
          interval,
          total: 0,
          correct: 0,
          accuracy: 0,
          trades: [],
          message:
            "Simulation could not complete on live data. Try BTCUSD/ETHUSD or lower min confidence.",
          barsUsed: 0,
          dataSource: "synthetic",
        },
      });
    }
  }
});

export default router;
