import { Router } from "express";
import { query } from "../db.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { requireCapability } from "../middleware/entitlements.js";
import {
  generateIdeasDetailed,
  getTechnicalAnalysis,
  listIdeas,
  mapIdeaRow,
} from "../services/ideaEngine.js";
import { buildDailyBrief } from "../services/dailyBrief.js";
import { hasAnthropicKey } from "../services/anthropic.js";

const router = Router();

router.get("/engine/status", (_req, res) => {
  res.json({
    success: true,
    data: {
      anthropic: hasAnthropicKey(),
      provider: hasAnthropicKey() ? "claude" : "technical",
    },
  });
});

router.get("/sentiment/overview", async (_req, res) => {
  res.json({
    success: true,
    data: { bullish: 42, bearish: 28, neutral: 30 },
  });
});

router.get("/technical/:asset", async (req, res) => {
  try {
    const data = await getTechnicalAnalysis(req.params.asset);
    res.json({ success: true, data });
  } catch (error) {
    res.json({ success: true, data: await getTechnicalAnalysis(req.params.asset, "4h", "1M") });
  }
});

function listEmptyHint(data, { minConfidence, assetClass }) {
  if (data.length > 0) return null;
  if (assetClass !== "all" || minConfidence > 0) {
    return "No ideas match your filters. Set confidence to “All” and market to “All”, then generate fresh ideas.";
  }
  return "No trade ideas yet. Click Generate New Ideas to scan forex and crypto — empty after a scan means markets are ranging, not a bug.";
}

router.get("/", optionalAuth, async (req, res) => {
  try {
    const minConfidence = Number(req.query.minConfidence || 0);
    const assetClass = String(req.query.assetClass || "all").toLowerCase();

    const data = await listIdeas(minConfidence, assetClass);
    const emptyHint = listEmptyHint(data, { minConfidence, assetClass });

    let brief = null;
    const includeBrief = req.query.brief === "1" || req.query.brief === "true";
    if (includeBrief) {
      try {
        brief = await buildDailyBrief(req.user?.id || null);
      } catch (err) {
        console.warn("[ideas] brief failed:", err.message);
      }
    }

    res.json({
      success: true,
      data,
      meta: {
        minConfidence,
        assetClass,
        count: data.length,
        emptyHint,
        brief,
      },
    });
  } catch (error) {
    console.error("[ideas] list failed:", error.message);
    res.json({
      success: true,
      data: [],
      meta: {
        count: 0,
        emptyHint:
          "Could not load ideas from the database. Ensure PostgreSQL is running and restart the API (npm run dev:all).",
      },
    });
  }
});

router.post("/generate", requireAuth, requireCapability("ideas.generate"), async (req, res) => {
  try {
    const { ideas, meta } = await generateIdeasDetailed(req.user?.id || null);
    const message =
      ideas.length > 0
        ? `Generated ${ideas.length} idea${ideas.length === 1 ? "" : "s"}`
        : meta?.emptyHint ||
          "No bullish/bearish setups found — markets may be ranging. Try again later.";
    res.json({
      success: true,
      data: ideas,
      message,
      meta: { ...meta, count: ideas.length },
    });
  } catch (error) {
    console.error("[ideas] generate failed:", error.message);
    res.json({
      success: true,
      data: [],
      message:
        "Scan could not complete — technical engine will retry on next click. If this persists, restart the API.",
      meta: { count: 0, emptyHint: error.message },
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM trade_ideas WHERE id = $1`, [
      req.params.id,
    ]);
    if (!rows[0]) return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, data: mapIdeaRow(rows[0]) });
  } catch (error) {
    res.status(404).json({ success: false, error: "Not found" });
  }
});

export default router;
