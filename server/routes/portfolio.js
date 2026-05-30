import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { safeAsync, isDbMissingError } from "../utils/safeRoute.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/stats",
  safeAsync(async (req, res) => {
    try {
      const { rows } = await query(
        `SELECT pnl, status, opened_at, closed_at
         FROM trades WHERE user_id = $1 ORDER BY created_at DESC LIMIT 500`,
        [req.user.id],
      );

      const totalPnl = rows.reduce((s, r) => s + Number(r.pnl || 0), 0);
      const wins = rows.filter((r) => (r.status || "").toUpperCase() === "WIN").length;
      const winRate = rows.length ? (wins / rows.length) * 100 : 0;

      let openPositions = 0;
      try {
        const { rows: openRows } = await query(
          `SELECT COUNT(*)::int AS open_count FROM live_positions
           WHERE user_id = $1 AND status = 'open'`,
          [req.user.id],
        );
        openPositions = openRows[0]?.open_count || 0;
      } catch {
        openPositions = 0;
      }

      res.json({
        success: true,
        data: {
          totalTrades: rows.length,
          totalPnl,
          winRate,
          openPositions,
        },
      });
    } catch (error) {
      if (isDbMissingError(error)) {
        return res.json({
          success: true,
          data: { totalTrades: 0, totalPnl: 0, winRate: 0, openPositions: 0 },
          meta: { degraded: true },
        });
      }
      throw error;
    }
  }),
);

export default router;
