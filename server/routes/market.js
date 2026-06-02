import { Router } from "express";
import { getAssetProfile } from "../config/assets.js";
import {
  getAllPrices,
  getAssetsList,
  getHistory,
  getSyntheticHistory,
  getLiveQuote,
} from "../services/marketData.js";

const router = Router();

router.get("/assets", (_req, res) => {
  res.json({ success: true, data: getAssetsList() });
});

router.get("/prices", async (_req, res) => {
  try {
    const data = await getAllPrices();
    res.json({ success: true, data, ts: Date.now() });
  } catch (error) {
    console.warn("[market] prices fallback:", error.message);
    res.json({ success: true, data: {}, meta: { degraded: true }, ts: Date.now() });
  }
});

router.get("/quote/:symbol", async (req, res) => {
  try {
    const data = await getLiveQuote(req.params.symbol);
    if (!data?.price) {
      return res.status(503).json({
        success: false,
        error: "Live quote unavailable for symbol",
        ts: Date.now(),
      });
    }
    res.json({ success: true, data, ts: Date.now() });
  } catch (error) {
    console.warn("[market] quote error:", req.params.symbol, error.message);
    res.status(503).json({ success: false, error: error.message, ts: Date.now() });
  }
});

router.get("/history/:symbol", async (req, res) => {
  const { symbol } = req.params;
  const interval = req.query.interval || "1day";
  const period = req.query.period || "1M";

  try {
    let bars = [];
    let synthetic = false;
    let source = "model";

    try {
      const loaded = await getHistory(symbol, interval, period);
      bars = Array.isArray(loaded?.bars) ? loaded.bars : [];
      synthetic = Boolean(loaded?.synthetic);
      source = loaded?.source || (synthetic ? "model" : "live");
    } catch (error) {
      console.warn("[market] history fetch error:", symbol, error.message);
    }

    if (bars.length < 2) {
      bars = getSyntheticHistory(symbol, interval, period);
      synthetic = true;
      source = "model";
    }

    return res.json({
      success: true,
      data: bars,
      meta: { count: bars.length, symbol, interval, period, synthetic, source },
    });
  } catch (error) {
    console.warn("[market] history route fallback:", symbol, error.message);
    const bars = getSyntheticHistory(symbol, interval, period);
    return res.json({
      success: true,
      data: bars,
      meta: {
        count: bars.length,
        symbol,
        interval,
        period,
        synthetic: true,
        source: "model",
      },
    });
  }
});

router.get("/asset/:symbol", (req, res) => {
  const profile = getAssetProfile(req.params.symbol);
  res.json({ success: true, data: profile });
});

export default router;
