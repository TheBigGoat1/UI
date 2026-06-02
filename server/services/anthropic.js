/**
 * Anthropic Messages API — trade ideas & chat.
 * Set ANTHROPIC_API_KEY in .env (sk-ant-api03-... from console.anthropic.com).
 */

import { query } from "../db.js";
const API_URL = "https://api.anthropic.com/v1/messages";
const VERSION = "2023-06-01";

export function hasAnthropicKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export async function chatCompletion({ system, user, maxTokens = 2048, temperature }) {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured");

  const model =
    process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514";

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      ...(temperature != null ? { temperature } : {}),
      system: system || "You are Insidr, an institutional trading intelligence assistant.",
      messages: [{ role: "user", content: user }],
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || `Anthropic HTTP ${res.status}`);
  }

  const text = json.content?.find((c) => c.type === "text")?.text || "";
  const inputTokens = Number(json?.usage?.input_tokens || 0);
  const outputTokens = Number(json?.usage?.output_tokens || 0);
  const estimatedCostUsd = Number(((inputTokens / 1000000) * 3 + (outputTokens / 1000000) * 15).toFixed(6));
  try {
    await query(
      `INSERT INTO system_logs (user_id, level, message, context)
       VALUES (NULL, 'info', 'anthropic.usage', $1::jsonb)`,
      [
        JSON.stringify({
          model,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          estimated_cost_usd: estimatedCostUsd,
        }),
      ],
    );
  } catch {
    // ignore telemetry failures
  }
  return text.trim();
}

/**
 * Multi-turn Claude — used for Insidr news analysis chat.
 * @param {{ system?: string, messages: { role: 'user'|'assistant', content: string }[], maxTokens?: number }} opts
 */
export async function chatCompletionMulti({ system, messages, maxTokens = 1024, temperature }) {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured");

  const model =
    process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514";

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      ...(temperature != null ? { temperature } : {}),
      system:
        system ||
        "You are Insidr, an institutional trading intelligence assistant.",
      messages: (messages || []).map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || ""),
      })),
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || `Anthropic HTTP ${res.status}`);
  }

  const text = json.content?.find((c) => c.type === "text")?.text || "";
  return text.trim();
}

export async function generateTradeIdeasFromAI(marketContext) {
  const prompt = `You are an institutional quant desk. Analyze this live market snapshot and return exactly 5 high-quality trade setups.

MARKET CONTEXT (JSON):
${JSON.stringify(marketContext, null, 2)}

Respond with ONLY valid JSON (no markdown fences), as an array of objects:
[
  {
    "symbol": "EURUSD",
    "direction": "bullish" or "bearish",
    "confidence": 55-92,
    "entry_price": number,
    "stop_loss": number,
    "target_price": number,
    "rationale": "2-3 sentence institutional rationale"
  }
]

Rules:
- Use symbols from the context only.
- direction must be bullish (long) or bearish (short).
- Stops and targets must be realistic vs entry_price.
- confidence reflects confluence of HTF/LTF alignment.`;

  const raw = await chatCompletion({
    system:
      "Output strict JSON only. No preamble. Expert FX/crypto/commodities strategist.",
    user: prompt,
    maxTokens: 2500,
  });

  const cleaned = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();
  if (!cleaned) return [];

  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : parsed?.ideas || [];
  } catch (err) {
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        /* fall through */
      }
    }
    console.warn("[anthropic] ideas JSON parse failed:", err.message);
    return [];
  }
}
