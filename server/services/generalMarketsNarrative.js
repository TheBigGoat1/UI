/**
 * Claude narratives for General Markets — sentiment blurb + capital flow summary.
 */

import { cached } from "./cache.js";
import { chatCompletion, hasAnthropicKey } from "./anthropic.js";
import { env } from "../config/env.js";

function parseNarrativeSections(raw = "") {
  const text = String(raw || "").trim();
  const out = { sentimentSummary: "", flowSummary: "" };
  if (!text) return out;

  const upper = text.toUpperCase();
  const sentIdx = upper.indexOf("SENTIMENT:");
  const flowIdx = upper.indexOf("FLOWS:");

  if (sentIdx >= 0 && flowIdx > sentIdx) {
    out.sentimentSummary = text.slice(sentIdx + 10, flowIdx).trim();
    out.flowSummary = text.slice(flowIdx + 6).trim();
  } else if (sentIdx >= 0) {
    out.sentimentSummary = text.slice(sentIdx + 10).trim();
  } else if (flowIdx >= 0) {
    out.flowSummary = text.slice(flowIdx + 6).trim();
  } else {
    out.sentimentSummary = text;
  }
  return out;
}

export async function getGeneralMarketsNarrative({
  sentiment = {},
  flows = [],
  flowMode = "liquidity",
  brief = null,
}) {
  if (!hasAnthropicKey()) {
    return { provider: "none", aiEnabled: false };
  }

  const model = env("ANTHROPIC_MODEL", "claude-sonnet-4-20250514");
  const flowLines = (flows || [])
    .slice(0, 13)
    .map((f) => `${f.ticker} ${f.pct >= 0 ? "+" : ""}${Number(f.pct).toFixed(2)}%`)
    .join(", ");

  const cacheKey = `desk:gm-narrative:${flowMode}:${sentiment?.score}:${flowLines.slice(0, 80)}`;

  return cached(cacheKey, 90000, async () => {
    const regime = brief?.regime || {};
    const raw = await chatCompletion({
      system:
        "You are Insidr / MRKT desk AI. Write institutional market copy grounded in the data. No disclaimers. Exactly two labeled sections.",
      user: `Desk snapshot:
Score ${sentiment?.score ?? "—"} (${sentiment?.label ?? ""}), regime ${sentiment?.regimeLabel ?? ""}.
Factors: ${(sentiment?.factors || []).map((f) => `${f.label} ${f.weight}%`).join("; ")}
VIX ${regime.vix ?? "—"}, environment ${regime.environment ?? "NEUTRAL"}.
${brief?.veteranLine ? `Context: ${brief.veteranLine}` : ""}

Flow mode: ${flowMode === "haven" ? "Safe Haven Assets" : "Capital Flows (liquidity)"}.
Session moves: ${flowLines || "flat"}.

Respond EXACTLY:
SENTIMENT:
(2-3 sentences, purple-style desk summary like MRKT terminal — equities, macro catalysts, risk tone)

FLOWS:
(2-3 sentences on sector/haven rotation matching the flow mode and the numbers above)`,
      maxTokens: 520,
      temperature: 0.38,
    });

    const sections = parseNarrativeSections(raw);
    return {
      provider: "anthropic",
      aiEnabled: true,
      model,
      ...sections,
    };
  });
}
