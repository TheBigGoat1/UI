import { Router } from "express";
import { query } from "../db.js";
import { resolveUser } from "../middleware/user.js";
import { safeAsync, isDbMissingError } from "../utils/safeRoute.js";

const router = Router();
router.use(resolveUser);

router.get(
  "/trades",
  safeAsync(async (req, res) => {
    try {
      const { rows } = await query(
        `SELECT id, exchange, symbol, side, entry_price, exit_price, quantity, pnl,
                r_multiple, strategy, emotion, mistakes, status, opened_at, closed_at, created_at
         FROM trades
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 500`,
        [req.user.id],
      );

      const data = rows.map((row) => ({
        id: row.id,
        asset: row.symbol,
        type: row.side?.toUpperCase(),
        exchange: row.exchange,
        strategy: row.strategy,
        emotion: row.emotion,
        mistakes: row.mistakes || [],
        status: row.status || (Number(row.pnl) >= 0 ? "WIN" : "LOSS"),
        entryDate: row.opened_at || row.created_at,
        pnl: Number(row.pnl),
        rMultiple: Number(row.r_multiple),
        size: row.quantity ? String(row.quantity) : null,
        hasScreenshot: false,
      }));

      res.json({ success: true, data });
    } catch (error) {
      if (isDbMissingError(error)) {
        return res.json({ success: true, data: [], meta: { degraded: true } });
      }
      throw error;
    }
  }),
);

router.post(
  "/trades",
  safeAsync(async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const {
      asset,
      type = "LONG",
      pnl = 0,
      strategy,
      emotion,
      mistakes = [],
      exchange,
    } = body;

    if (!asset) {
      return res.status(400).json({ success: false, error: "Asset symbol is required." });
    }

    try {
      const side = String(type).toLowerCase() === "short" ? "short" : "long";
      const status = Number(pnl) >= 0 ? "WIN" : "LOSS";

      const { rows } = await query(
        `INSERT INTO trades (
           user_id, exchange, symbol, side, pnl, r_multiple, strategy, emotion, mistakes, status, opened_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
         RETURNING *`,
        [
          req.user.id,
          exchange || null,
          asset,
          side,
          pnl,
          Number(pnl) / 50,
          strategy || null,
          emotion || null,
          mistakes,
          status,
        ],
      );

      res.json({ success: true, data: rows[0] });
    } catch (error) {
      if (isDbMissingError(error)) {
        return res.status(503).json({
          success: false,
          error: "Journal database not ready. Run npm run db:setup and restart the API.",
        });
      }
      throw error;
    }
  }),
);

export default router;
