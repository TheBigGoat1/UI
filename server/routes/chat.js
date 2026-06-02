import { Router } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { hasCapability, capabilityUpgradeHint } from "../services/subscriptionAccess.js";
import { getAllPrices } from "../services/marketData.js";
import { cached } from "../services/cache.js";
import { chatCompletion, hasAnthropicKey } from "../services/anthropic.js";
import {
  analyzeNewsHeadline,
  continueNewsAnalysis,
} from "../services/newsAnalysis.js";

const router = Router();

async function fetchVix() {
  const url =
    "https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=5d";
  const res = await fetch(url, { headers: { "User-Agent": "INSIDR/1.0" } });
  const json = await res.json();
  const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
  return closes.filter((c) => c != null).pop() || 18;
}

function fallbackReply(message, prices, vix) {
  if (message.includes("vix") || message.includes("risk")) {
    const regime = vix < 16 ? "risk-on" : vix >= 24 ? "risk-off" : "neutral";
    return `VIX is ${Number(vix).toFixed(1)} — ${regime} regime.`;
  }
  if (message.includes("eur")) {
    const e = prices.EURUSD;
    return e
      ? `EURUSD ${e.price?.toFixed(4)} (${Number(e.changePercent).toFixed(2)}%).`
      : "EURUSD feed syncing.";
  }
  return `Macro snapshot: VIX ${Number(vix).toFixed(1)}. Ask about a symbol or open Ideas for setups.`;
}

router.post("/", optionalAuth, async (req, res) => {
  const message = String(req.body.message || "").trim();
  const prices = await getAllPrices();
  const vix = await cached("risk:vix", 60000, fetchVix);

  try {
    if (hasAnthropicKey() && message.length > 2 && hasCapability(req.user, "chat.advanced")) {
      const reply = await chatCompletion({
        user: `User question: ${message}

Live prices sample: EURUSD ${prices.EURUSD?.price}, BTC ${prices.BTCUSD?.price}, XAU ${prices.XAUUSD?.price}. VIX ~${vix.toFixed(1)}.

Answer in 2-4 concise sentences as an institutional trading coach.`,
        maxTokens: 400,
      });
      return res.json({
        success: true,
        data: { reply, provider: "anthropic", tier: req.user?.tier || "free" },
      });
    }
  } catch (err) {
    console.warn("[chat] Anthropic failed:", err.message);
  }

  res.json({
    success: true,
    data: {
      reply: fallbackReply(message.toLowerCase(), prices, vix),
      provider: "local",
      upgrade: hasAnthropicKey()
        ? {
            capability: "chat.advanced",
            required: "elite",
            path: "/dashboard/pricing",
          }
        : null,
    },
  });
});

/** Insidr Analysis — initial Claude desk note for a headline */
router.post("/news-insight", requireAuth, async (req, res) => {
  if (!hasCapability(req.user, "news.ai_insight")) {
    return res.status(403).json({
      success: false,
      error: "Insidr Analysis requires Pro or Elite.",
      code: "capability_required",
      capability: "news.ai_insight",
      upgrade: capabilityUpgradeHint("news.ai_insight"),
    });
  }

  const title = String(req.body.title || "").trim();
  const summary = String(req.body.summary || req.body.description || "").trim();
  const asset = String(req.body.asset || "XAUUSD").toUpperCase();
  const symbols = Array.isArray(req.body.symbols) ? req.body.symbols : [];
  const marketContext = req.body.marketContext || null;
  const articleId = req.body.articleId || req.body.id || null;
  const source = req.body.source || null;
  const publishedAt = req.body.publishedAt || req.body.time || null;
  const impact = req.body.impact || req.body.category || null;
  const sentimentScore =
    req.body.sentimentScore != null
      ? Number(req.body.sentimentScore)
      : req.body.sentiment_score != null
        ? Number(req.body.sentiment_score)
        : null;

  try {
    const result = await analyzeNewsHeadline({
      title,
      summary,
      asset,
      symbols,
      marketContext,
      articleId,
      source,
      publishedAt,
      impact,
      sentimentScore: Number.isFinite(sentimentScore) ? sentimentScore : null,
    });
    return res.json({
      success: true,
      data: {
        ...result,
        reply: result.analysis,
        asset,
        claude_configured: hasAnthropicKey(),
      },
    });
  } catch (err) {
    console.error("[chat] news-insight", err);
    res.status(500).json({ success: false, error: err.message || "Analysis failed." });
  }
});

/** Insidr Analysis — follow-up chat on the same headline */
router.post("/news-insight/chat", requireAuth, async (req, res) => {
  if (!hasCapability(req.user, "news.ai_insight")) {
    return res.status(403).json({
      success: false,
      error: "Insidr Analysis chat requires Pro or Elite.",
      code: "capability_required",
      capability: "news.ai_insight",
      upgrade: capabilityUpgradeHint("news.ai_insight"),
    });
  }

  const title = String(req.body.title || "").trim();
  const summary = String(req.body.summary || req.body.description || "").trim();
  const asset = String(req.body.asset || "XAUUSD").toUpperCase();
  const symbols = Array.isArray(req.body.symbols) ? req.body.symbols : [];
  const messages = Array.isArray(req.body.messages) ? req.body.messages : [];

  if (!messages.length) {
    return res.status(400).json({ success: false, error: "messages array required." });
  }

  try {
    const result = await continueNewsAnalysis({
      title,
      summary,
      asset,
      symbols,
      messages,
    });
    return res.json({
      success: true,
      data: { ...result, asset, claude_configured: hasAnthropicKey() },
    });
  } catch (err) {
    console.error("[chat] news-insight/chat", err);
    res.status(500).json({ success: false, error: err.message || "Chat failed." });
  }
});

export default router;
