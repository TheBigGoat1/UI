import { Router } from "express";
import { cached } from "../services/cache.js";
import { getAssetAnalysis } from "../services/assetAnalysis.js";
import { getAssetProfile } from "../config/assets.js";

const router = Router();

async function fetchVix() {
  const url =
    "https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=5d";
  const res = await fetch(url, { headers: { "User-Agent": "INSIDR/1.0" } });
  const json = await res.json();
  const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
  const last = closes.filter((c) => c != null).pop();
  return last != null ? Number(last) : 18.5;
}

router.get("/risk-environment", async (_req, res) => {
  try {
    const vix = await cached("risk:vix", 60000, fetchVix);

    let environment = "NEUTRAL_RISK";
    let interpretation = "Markets in a balanced volatility regime.";
    if (vix < 16) {
      environment = "RISK_ON";
      interpretation = "Low volatility supports risk assets and carry trades.";
    } else if (vix >= 24) {
      environment = "RISK_OFF";
      interpretation = "Elevated fear — defensive positioning and tighter risk.";
    }

    res.json({
      success: true,
      data: {
        environment,
        interpretation,
        score: Math.max(0, Math.min(100, 100 - vix * 2)),
        details: {
          vix: { level: Number(vix.toFixed(2)), source: "Yahoo Finance" },
        },
      },
    });
  } catch (error) {
    res.json({
      success: true,
      data: {
        environment: "NEUTRAL_RISK",
        interpretation: "Risk data temporarily unavailable.",
        details: { vix: { level: "—" } },
      },
    });
  }
});

router.get("/fundamental/:symbol", (req, res) => {
  const profile = getAssetProfile(req.params.symbol);
  res.json({
    success: true,
    data: {
      symbol: req.params.symbol,
      summary: profile.typical_behaviour,
      key_drivers: profile.key_drivers,
      correlations: profile.correlations,
    },
  });
});

/** Unified technical + profile bundle (stable; never 500) */
router.get("/asset/:symbol", async (req, res) => {
  try {
    const interval = req.query.interval || "4h";
    const period = req.query.period || "1M";
    const data = await getAssetAnalysis(req.params.symbol, interval, period);
    res.json({ success: true, data });
  } catch (error) {
    console.warn("[analysis] asset route:", error.message);
    const data = await getAssetAnalysis(req.params.symbol, "4h", "1M");
    res.json({ success: true, data });
  }
});

router.get("/technical/:symbol", async (req, res) => {
  const interval = req.query.interval || "4h";
  const period = req.query.period || "1M";
  const data = await getAssetAnalysis(req.params.symbol, interval, period);
  res.json({ success: true, data: data.technical });
});

export default router;
