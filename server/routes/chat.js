import { Router } from "express";
import { optionalAuth } from "../middleware/auth.js";
import { hasCapability } from "../services/subscriptionAccess.js";
import { getAllPrices } from "../services/marketData.js";
import { cached } from "../services/cache.js";
import { chatCompletion, hasAnthropicKey } from "../services/anthropic.js";

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

export default router;
