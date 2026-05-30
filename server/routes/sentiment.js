import { Router } from "express";
import { query } from "../db.js";
import { safeAsync, isDbMissingError } from "../utils/safeRoute.js";

const router = Router();

const NEUTRAL = (symbol) => ({
  symbol,
  score: 0,
  label: "neutral",
  articles: [],
  message: "Sync news or add NewsAPI / NewsData keys for sentiment coverage.",
});

router.get(
  "/:symbol",
  safeAsync(async (req, res) => {
    const symbol = String(req.params.symbol || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (!symbol) {
      return res.status(400).json({ success: false, error: "Symbol required." });
    }

    try {
      const { rows } = await query(
        `SELECT ns.sentiment, ns.score, ns.rationale, na.title, na.published_at
         FROM news_articles na
         JOIN news_sentiment ns ON ns.article_id = na.id
         WHERE $1 = ANY(na.symbols)
         ORDER BY na.published_at DESC
         LIMIT 10`,
        [symbol],
      );

      if (rows.length) {
        const bullish = rows.filter((r) => r.sentiment === "bullish").length;
        const bearish = rows.filter((r) => r.sentiment === "bearish").length;
        const score = Math.round(((bullish - bearish) / rows.length) * 100);
        return res.json({
          success: true,
          data: {
            symbol,
            score,
            label: score > 20 ? "bullish" : score < -20 ? "bearish" : "neutral",
            articles: rows,
          },
        });
      }

      res.json({ success: true, data: NEUTRAL(symbol) });
    } catch (error) {
      if (isDbMissingError(error)) {
        return res.json({ success: true, data: NEUTRAL(symbol), meta: { degraded: true } });
      }
      throw error;
    }
  }),
);

export default router;
