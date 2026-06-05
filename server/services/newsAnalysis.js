/**
 * Insidr Analysis — headline-grounded market intelligence.
 * Claude when configured; deterministic headline engine otherwise.
 */

import crypto from "crypto";
import { cached } from "./cache.js";
import { getAllPrices } from "./marketData.js";
import {
  chatCompletion,
  chatCompletionMulti,
  hasAnthropicKey,
} from "./anthropic.js";
import {
  buildDeterministicNewsAnalysis,
  inferHeadlineAssets,
  analysisGroundingScore,
  isGenericAnalysis,
  classifyHeadline,
  extractHeadlineAnchors,
} from "../utils/headlineIntelligence.js";

const INSIDR_NEWS_SYSTEM = `You are Insidr Desk AI — institutional news analyst.
Write ONE cohesive market-read paragraph (3–5 sentences). No bullet lists inside the paragraph. No chat tone. No disclaimers.

CRITICAL — grounding:
- Read ONLY the HEADLINE, SUMMARY, SYMBOLS, and metadata in the user message. Your analysis must be about THAT story.
- Name the primary subject from the headline (company, country, policy, commodity, or event) in the first sentence.
- Do NOT reuse example scenarios from instructions (no generic Strait/shipping templates unless the headline is about that).
- "bias" on each asset is the expected direction FROM THIS HEADLINE (helped/hurt), NOT today's price tick.
- Do not invent facts, numbers, or quotes not present in the input.
- Explain transmission (who wins/loses), and whether the move is likely shallow or durable.
- When technical context is provided, tie the last sentence to the desk chart symbol only if relevant to this headline.

Output JSON only when requested.`;

const WATCH_SYMBOLS = [
  "XAUUSD",
  "EURUSD",
  "GBPUSD",
  "ESUSD",
  "NQUSD",
  "BTCUSD",
  "CLUSD",
  "BZUSD",
  "DXY",
  "VIX",
];

async function fetchVix() {
  const url =
    "https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=5d";
  const res = await fetch(url, { headers: { "User-Agent": "Insidr/1.0" } });
  const json = await res.json();
  const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
  return closes.filter((c) => c != null).pop() || 18;
}

export async function buildNewsMarketSnapshot(deskAsset = "XAUUSD") {
  const prices = await getAllPrices();
  const vix = await cached("risk:vix", 60000, fetchVix);
  const quotes = {};

  for (const sym of WATCH_SYMBOLS) {
    const row = prices[sym] || prices[sym.replace("^", "")];
    if (!row) continue;
    quotes[sym] = {
      price: row.price,
      change_pct: Number(row.changePercent ?? row.change_percent ?? row.change ?? 0),
    };
  }

  const desk = prices[deskAsset];
  if (desk) {
    quotes[deskAsset] = {
      price: desk.price,
      change_pct: Number(desk.changePercent ?? desk.change_percent ?? desk.change ?? 0),
    };
  }

  return {
    as_of: new Date().toISOString(),
    vix: Number(Number(vix).toFixed(2)),
    desk_asset: deskAsset,
    quotes,
  };
}

/** @deprecated use inferHeadlineAssets — kept for imports */
export function inferInsightAssets(title, symbols = [], asset = "XAUUSD", summary = "") {
  return inferHeadlineAssets(title, symbols, asset, summary);
}

function insightCacheKey(title, summary, asset, articleId) {
  const base = articleId || `${title}|${summary}|${asset}`;
  return `news:insight:${crypto.createHash("sha256").update(base).digest("hex").slice(0, 20)}`;
}

function parseNewsAnalysisJson(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim().replace(/^```json?\s*/i, "").replace(/```\s*$/i, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1));
    const analysis =
      parsed.analysis ||
      parsed.reply ||
      parsed.body ||
      "";
    if (!analysis && !parsed.headline_take) return null;
    return {
      headline_take: parsed.headline_take || "",
      analysis: analysis || parsed.headline_take,
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets : [],
      desk_note: parsed.desk_note || "",
      assets: Array.isArray(parsed.assets) ? parsed.assets : [],
    };
  } catch {
    return null;
  }
}

export function newsAnalysisFallback(
  title,
  summary,
  asset,
  symbols,
  snapshot,
  technical = {},
  sentimentScore = null,
) {
  const built = buildDeterministicNewsAnalysis({
    title,
    summary,
    asset,
    symbols,
    snapshot,
    technical,
    sentimentScore,
  });
  return {
    analysis: built.analysis,
    assets: built.assets,
    provider: "deterministic",
    aiEnabled: false,
    theme: built.theme,
    tone: built.tone,
  };
}

function normalizeAnalysisResult(parsed, title, summary, symbols, asset) {
  if (!parsed.assets?.length) {
    parsed.assets = inferHeadlineAssets(title, symbols, asset, summary);
  }
  parsed.assets = parsed.assets.slice(0, 8).map((a) => ({
    symbol: String(a.symbol || a.ticker || "").toUpperCase() || "—",
    label: a.label || a.symbol || "Asset",
    bias: ["up", "down", "neutral"].includes(a.bias) ? a.bias : "neutral",
    rationale: a.rationale || "",
  }));
  if (!parsed.bullets?.length) {
    parsed.bullets = [];
  }
  return parsed;
}

function buildAnalysisUserPrompt({
  title,
  summary,
  asset,
  symbols,
  snapshot,
  technical,
  meta,
}) {
  const theme = classifyHeadline(title, summary);
  const anchors = extractHeadlineAnchors(title, summary);
  return `Analyze this exact news item for the trading desk.

HEADLINE: ${title}
SUMMARY: ${summary || "Not provided"}
SOURCE: ${meta.source || "unknown"}
PUBLISHED: ${meta.publishedAt || "unknown"}
IMPACT TAG: ${meta.impact || meta.category || "n/a"}
SENTIMENT SCORE: ${meta.sentimentScore != null ? meta.sentimentScore : "n/a"}
DETECTED THEME (hint): ${theme}
KEY ENTITIES (must reference at least one in sentence 1): ${anchors.join(", ") || "derive from headline"}

DESK CHART SYMBOL: ${asset}
RELATED SYMBOLS: ${(symbols || []).join(", ") || "none"}

CHART / TECHNICAL CONTEXT (desk — do not let this override headline story):
${JSON.stringify(technical, null, 2)}

LIVE MARKET SNAPSHOT (session context only — do not set asset bias from these ticks):
${JSON.stringify(snapshot, null, 2)}

Return ONLY valid JSON:
{
  "analysis": "One paragraph. Sentence 1 names the headline subject. Explain who is helped/hurt, depth/durability. Last sentence may reference ${asset} chart only if this story affects it.",
  "assets": [
    { "symbol": "CLUSD", "label": "Oil", "bias": "up", "rationale": "8-12 words tied to THIS headline" }
  ]
}
Include 5-7 assets most affected by THIS headline. bias = up|down|neutral vs this story (not today's % change).`;
}

async function runNewsAnalysis({
  title,
  summary = "",
  asset = "XAUUSD",
  symbols = [],
  marketContext = null,
  meta = {},
}) {
  const snapshot = await buildNewsMarketSnapshot(asset);
  const technical = marketContext || {};
  const sentimentScore = meta.sentimentScore ?? null;

  if (!title || title.length < 4) {
    return {
      ...newsAnalysisFallback(title, summary, asset, symbols, snapshot, technical, sentimentScore),
      provider: "local",
      model: null,
      market_snapshot: snapshot,
    };
  }

  if (!hasAnthropicKey()) {
    return {
      ...newsAnalysisFallback(title, summary, asset, symbols, snapshot, technical, sentimentScore),
      provider: "deterministic",
      model: null,
      market_snapshot: snapshot,
      claude_configured: false,
    };
  }

  try {
    const raw = await chatCompletion({
      system: INSIDR_NEWS_SYSTEM,
      user: buildAnalysisUserPrompt({
        title,
        summary,
        asset,
        symbols,
        snapshot,
        technical,
        meta,
      }),
      maxTokens: 800,
      temperature: 0.2,
    });

    const parsed = parseNewsAnalysisJson(raw);
    if (parsed?.analysis) {
      const grounded =
        analysisGroundingScore(title, parsed.analysis) >= 0.15 &&
        !isGenericAnalysis(parsed.analysis);
      if (!grounded) {
        console.warn("[newsAnalysis] Low grounding — using deterministic merge");
        const local = buildDeterministicNewsAnalysis({
          title,
          summary,
          asset,
          symbols,
          snapshot,
          technical,
          sentimentScore,
        });
        parsed.analysis = `${local.analysis.split(".").slice(0, 2).join(".")}. ${parsed.analysis}`;
      }
      const out = normalizeAnalysisResult(parsed, title, summary, symbols, asset);
      return {
        analysis: out.analysis,
        assets: out.assets,
        provider: "anthropic",
        aiEnabled: true,
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        market_snapshot: snapshot,
        claude_configured: true,
      };
    }

    const prose = String(raw).replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();
    const useProse =
      prose.length > 40 &&
      analysisGroundingScore(title, prose) >= 0.15 &&
      !isGenericAnalysis(prose);

    if (useProse) {
      return {
        analysis: prose,
        assets: inferHeadlineAssets(title, symbols, asset, summary),
        provider: "anthropic",
        aiEnabled: true,
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        market_snapshot: snapshot,
        claude_configured: true,
      };
    }

    return {
      ...newsAnalysisFallback(title, summary, asset, symbols, snapshot, technical, sentimentScore),
      provider: "deterministic",
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      market_snapshot: snapshot,
      claude_configured: true,
      note: "model_response_ungrounded",
    };
  } catch (err) {
    console.warn("[newsAnalysis] Claude failed:", err.message);
    return {
      ...newsAnalysisFallback(title, summary, asset, symbols, snapshot, technical, sentimentScore),
      provider: "deterministic",
      model: null,
      error: err.message,
      market_snapshot: snapshot,
      claude_configured: true,
    };
  }
}

export async function analyzeNewsHeadline({
  title,
  summary = "",
  asset = "XAUUSD",
  symbols = [],
  marketContext = null,
  articleId = null,
  source = null,
  publishedAt = null,
  impact = null,
  sentimentScore = null,
}) {
  const meta = {
    source,
    publishedAt,
    impact,
    sentimentScore,
  };
  const key = insightCacheKey(title, summary, asset, articleId);
  return cached(key, 12 * 60 * 1000, () =>
    runNewsAnalysis({ title, summary, asset, symbols, marketContext, meta }),
  );
}

export async function continueNewsAnalysis({
  title,
  summary = "",
  asset = "XAUUSD",
  symbols = [],
  messages = [],
}) {
  const snapshot = await buildNewsMarketSnapshot(asset);
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const question = lastUser?.content || "";
  const localAssets = inferHeadlineAssets(title, symbols, asset, summary);

  if (!hasAnthropicKey()) {
    const local = buildDeterministicNewsAnalysis({
      title,
      summary,
      asset,
      symbols,
      snapshot,
      technical: {},
    });
    return {
      reply: `${local.analysis.split(".").slice(0, 2).join(".")}. Re: your question — ${question.slice(0, 200)}. Set ANTHROPIC_API_KEY for full Claude follow-up.`,
      provider: "deterministic",
      assets: localAssets,
    };
  }

  const contextBlock = `[Headline — stay on this story only]
Title: ${title}
Summary: ${summary || "n/a"}
Desk symbol: ${asset}
Related symbols: ${(symbols || []).join(", ") || "none"}
Live snapshot: ${JSON.stringify(snapshot)}`;

  const thread = [
    { role: "user", content: contextBlock },
    ...messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-10)
      .map((m) => ({ role: m.role, content: String(m.content || "") })),
  ];

  try {
    const raw = await chatCompletionMulti({
      system: `${INSIDR_NEWS_SYSTEM}

You are in an Insidr Analysis follow-up about the headline above. Answer the trader's latest message in 2-5 sentences. Reference the headline subject and implications — do not give generic macro lectures.`,
      messages: thread,
      maxTokens: 550,
      temperature: 0.25,
    });

    return {
      reply: raw,
      provider: "anthropic",
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      assets: localAssets,
    };
  } catch (err) {
    console.warn("[newsAnalysis] chat follow-up:", err.message);
    return {
      reply: `Could not reach Claude: ${err.message}`,
      provider: "local",
      assets: localAssets,
    };
  }
}
