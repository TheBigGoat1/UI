import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getTradingProfile,
  upsertTradingProfile,
  computeBookHeat,
  suggestPositionSize,
} from "../services/tradingProfile.js";
import { getScorecard, getWeeklyDebrief, getSetupStatsForSymbol } from "../services/scorecard.js";
import { getEventGateForSymbol, getUpcomingHighImpactGate } from "../services/eventGate.js";
import { query } from "../db.js";
import { mapIdeaRow } from "../services/ideaEngine.js";
import { safeAsync, isDbMissingError } from "../utils/safeRoute.js";

const router = Router();

const DEFAULT_PROFILE = {
  account_size: 10000,
  risk_percent: 1,
  max_open_trades: 3,
  max_book_heat_pct: 3,
};

router.get("/ping", (_req, res) => {
  res.json({
    success: true,
    data: {
      service: "trader",
      features: ["watchlist", "event-gate", "profile", "heat", "scorecard"],
    },
  });
});

router.get(
  "/watchlist",
  requireAuth,
  safeAsync(async (req, res) => {
    try {
      const { rows } = await query(
        `SELECT symbol, asset_class, created_at
         FROM watchlist
         WHERE user_id = $1
         ORDER BY created_at ASC`,
        [req.user.id],
      );
      res.json({
        success: true,
        data: rows.map((row) => ({
          symbol: row.symbol,
          assetClass: row.asset_class,
          createdAt: row.created_at,
        })),
      });
    } catch (error) {
      if (isDbMissingError(error)) {
        return res.json({ success: true, data: [], meta: { degraded: true } });
      }
      throw error;
    }
  }),
);

router.post(
  "/watchlist",
  requireAuth,
  safeAsync(async (req, res) => {
    const symbol = String(req.body?.symbol || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (symbol.length < 3 || symbol.length > 12) {
      return res.status(400).json({ success: false, error: "Enter a valid symbol (3–12 characters)." });
    }

    try {
      await query(
        `INSERT INTO watchlist (user_id, symbol)
         VALUES ($1, $2)
         ON CONFLICT (user_id, symbol) DO NOTHING`,
        [req.user.id, symbol],
      );

      const { rows } = await query(
        `SELECT symbol, asset_class, created_at
         FROM watchlist
         WHERE user_id = $1
         ORDER BY created_at ASC`,
        [req.user.id],
      );

      res.json({
        success: true,
        data: rows.map((row) => ({
          symbol: row.symbol,
          assetClass: row.asset_class,
          createdAt: row.created_at,
        })),
      });
    } catch (error) {
      if (isDbMissingError(error)) {
        return res.status(503).json({
          success: false,
          error: "Watchlist storage unavailable. Run npm run db:setup.",
        });
      }
      throw error;
    }
  }),
);

router.delete(
  "/watchlist/:symbol",
  requireAuth,
  safeAsync(async (req, res) => {
    const symbol = String(req.params.symbol || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (!symbol) {
      return res.status(400).json({ success: false, error: "Symbol required." });
    }

    try {
      await query(`DELETE FROM watchlist WHERE user_id = $1 AND symbol = $2`, [
        req.user.id,
        symbol,
      ]);

      const { rows } = await query(
        `SELECT symbol, asset_class, created_at
         FROM watchlist
         WHERE user_id = $1
         ORDER BY created_at ASC`,
        [req.user.id],
      );

      res.json({
        success: true,
        data: rows.map((row) => ({
          symbol: row.symbol,
          assetClass: row.asset_class,
          createdAt: row.created_at,
        })),
      });
    } catch (error) {
      if (isDbMissingError(error)) {
        return res.status(503).json({
          success: false,
          error: "Watchlist storage unavailable. Run npm run db:setup.",
        });
      }
      throw error;
    }
  }),
);

router.get(
  "/profile",
  requireAuth,
  safeAsync(async (req, res) => {
    try {
      const profile = await getTradingProfile(req.user.id);
      res.json({ success: true, data: profile });
    } catch (error) {
      if (isDbMissingError(error)) {
        return res.json({ success: true, data: DEFAULT_PROFILE, meta: { degraded: true } });
      }
      throw error;
    }
  }),
);

router.put(
  "/profile",
  requireAuth,
  safeAsync(async (req, res) => {
    try {
      const profile = await upsertTradingProfile(req.user.id, req.body || {});
      res.json({ success: true, data: profile });
    } catch (error) {
      if (isDbMissingError(error)) {
        return res.status(503).json({
          success: false,
          error: "Trader profile storage unavailable. Run npm run db:setup.",
        });
      }
      throw error;
    }
  }),
);

router.get(
  "/heat",
  requireAuth,
  safeAsync(async (req, res) => {
    try {
      const profile = await getTradingProfile(req.user.id);
      const heat = await computeBookHeat(req.user.id, profile);
      res.json({ success: true, data: { profile, heat } });
    } catch (error) {
      if (isDbMissingError(error)) {
        return res.json({
          success: true,
          data: {
            profile: DEFAULT_PROFILE,
            heat: { usedPct: 0, openCount: 0, slotsLeft: DEFAULT_PROFILE.max_open_trades },
          },
          meta: { degraded: true },
        });
      }
      throw error;
    }
  }),
);

router.get(
  "/scorecard",
  requireAuth,
  safeAsync(async (req, res) => {
    try {
      const data = await getScorecard(req.user.id);
      res.json({ success: true, data });
    } catch (error) {
      if (isDbMissingError(error)) {
        return res.json({
          success: true,
          data: { wins: 0, losses: 0, winRate: 0, avgR: 0, trades: [] },
          meta: { degraded: true },
        });
      }
      throw error;
    }
  }),
);

router.get(
  "/debrief",
  requireAuth,
  safeAsync(async (req, res) => {
    try {
      const data = await getWeeklyDebrief(req.user.id);
      res.json({ success: true, data });
    } catch (error) {
      if (isDbMissingError(error)) {
        return res.json({
          success: true,
          data: { weekLabel: "This week", highlights: [], lessons: [], stats: {} },
          meta: { degraded: true },
        });
      }
      throw error;
    }
  }),
);

router.get(
  "/setup-stats/:symbol",
  requireAuth,
  safeAsync(async (req, res) => {
    try {
      const data = await getSetupStatsForSymbol(req.user.id, req.params.symbol);
      res.json({ success: true, data });
    } catch (error) {
      if (isDbMissingError(error)) {
        return res.json({
          success: true,
          data: { symbol: req.params.symbol, samples: 0, winRate: null },
          meta: { degraded: true },
        });
      }
      throw error;
    }
  }),
);

router.get(
  "/event-gate",
  requireAuth,
  safeAsync(async (req, res) => {
    try {
      const profile = await getTradingProfile(req.user.id);
      const windowMinutes =
        Number(req.query.minutes) || profile.event_gate_minutes || 45;
      const symbol = req.query.symbol
        ? String(req.query.symbol).toUpperCase().replace(/[^A-Z0-9]/g, "")
        : null;

      const data = symbol
        ? await getEventGateForSymbol(symbol, windowMinutes)
        : await getUpcomingHighImpactGate(windowMinutes);

      res.json({ success: true, data: { ...data, windowMinutes } });
    } catch (error) {
      if (isDbMissingError(error)) {
        return res.json({
          success: true,
          data: {
            blocked: false,
            warning: false,
            minutesUntil: null,
            nextEvent: null,
            eventCount: 0,
          },
          meta: { degraded: true },
        });
      }
      throw error;
    }
  }),
);

router.post(
  "/size-preview",
  requireAuth,
  safeAsync(async (req, res) => {
    const { idea_id } = req.body || {};
    if (!idea_id) {
      return res.status(400).json({ success: false, error: "idea_id required" });
    }

    try {
      const { rows } = await query(`SELECT * FROM trade_ideas WHERE id = $1`, [idea_id]);
      if (!rows[0]) {
        return res.status(404).json({ success: false, error: "Idea not found" });
      }
      const idea = mapIdeaRow(rows[0]);
      const profile = await getTradingProfile(req.user.id);
      const size = suggestPositionSize(idea, profile);
      const heat = await computeBookHeat(req.user.id, profile, [idea]);
      res.json({ success: true, data: { size, heat, profile } });
    } catch (error) {
      if (isDbMissingError(error)) {
        return res.status(503).json({
          success: false,
          error: "Position sizing unavailable until database is set up.",
        });
      }
      throw error;
    }
  }),
);

export default router;
