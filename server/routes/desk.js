import { Router } from "express";
import { optionalAuth } from "../middleware/auth.js";
import {
  getDeskIntelligenceBundle,
  getCapitalFlowsLive,
  analyzeCalendarEventDesk,
  getCalendarEventsForSymbol,
  getCountryIntelligence,
  getDeskAiStatus,
} from "../services/deskIntelligence.js";
import {
  getCentralBankRateSeries,
  getRateDecisionRows,
} from "../services/centralBankRates.js";
import { analyzeCandleMoment } from "../services/candleAnalysis.js";
import { getGeneralMarketsNarrative } from "../services/generalMarketsNarrative.js";
import { safeAsync } from "../utils/safeRoute.js";

const router = Router();

router.get(
  "/rates/:country/series",
  optionalAuth,
  safeAsync(async (req, res) => {
    const country = String(req.params.country || "US").toUpperCase();
    const data = await getCentralBankRateSeries(country);
    res.json({ success: true, data });
  }),
);

router.get(
  "/rates/decisions",
  optionalAuth,
  safeAsync(async (req, res) => {
    const country = req.query.country ? String(req.query.country).toUpperCase() : null;
    const data = await getRateDecisionRows(country);
    res.json({ success: true, data });
  }),
);

router.get(
  "/capital-flows",
  optionalAuth,
  safeAsync(async (_req, res) => {
    const data = await getCapitalFlowsLive();
    res.json({ success: true, data });
  }),
);

router.get(
  "/intelligence",
  optionalAuth,
  safeAsync(async (req, res) => {
    const symbol = String(req.query.symbol || "XAUUSD").toUpperCase();
    const data = await getDeskIntelligenceBundle(symbol);
    res.json({ success: true, data });
  }),
);

router.get(
  "/calendar/:symbol",
  optionalAuth,
  safeAsync(async (req, res) => {
    const symbol = String(req.params.symbol || "XAUUSD").toUpperCase();
    const data = await getCalendarEventsForSymbol(symbol);
    res.json({ success: true, data });
  }),
);

router.get(
  "/ai-status",
  optionalAuth,
  safeAsync(async (_req, res) => {
    res.json({ success: true, data: getDeskAiStatus() });
  }),
);

router.post(
  "/general-markets-narrative",
  optionalAuth,
  safeAsync(async (req, res) => {
    const data = await getGeneralMarketsNarrative({
      sentiment: req.body.sentiment,
      flows: req.body.flows,
      flowMode: req.body.flowMode || "liquidity",
      brief: req.body.brief,
    });
    res.json({ success: true, data });
  }),
);

router.post(
  "/calendar-event-analysis",
  optionalAuth,
  safeAsync(async (req, res) => {
    const event = req.body.event || req.body;
    const symbol = String(req.body.symbol || "XAUUSD").toUpperCase();
    const result = await analyzeCalendarEventDesk({ event, symbol });
    res.json({ success: true, data: result });
  }),
);

router.get(
  "/economy/:country",
  optionalAuth,
  safeAsync(async (req, res) => {
    const country = String(req.params.country || "US").toUpperCase();
    const data = await getCountryIntelligence(country);
    res.json({ success: true, data });
  }),
);

router.post(
  "/candle-analysis",
  optionalAuth,
  safeAsync(async (req, res) => {
    const symbol = String(req.body.symbol || "XAUUSD").toUpperCase();
    const headline = req.body.headline || req.body.article || {};
    const marketContext = req.body.marketContext || null;
    const relatedNewsPool = Array.isArray(req.body.relatedNews) ? req.body.relatedNews : [];
    const data = await analyzeCandleMoment({
      symbol,
      headline,
      marketContext,
      relatedNewsPool,
    });
    res.json({ success: true, data });
  }),
);

export default router;
