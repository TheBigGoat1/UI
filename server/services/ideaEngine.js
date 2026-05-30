import { query } from "../db.js";
import { ASSETS, getAssetClass, getSymbolsByClass } from "../config/assets.js";
import { getHistory, getAllPrices } from "./marketData.js";
import { analyzeBars } from "./technical.js";
import { generateTradeIdeasFromAI, hasAnthropicKey } from "./anthropic.js";
import { getTechnicalAnalysis } from "./assetAnalysis.js";
import {
  scanAllIdeaCandidates,
  diversifyIdeaCandidates,
  scanIdeaCandidate,
  confidenceToScale10,
  IDEA_TRIGGER_INTERVAL,
} from "./ideaScanner.js";
import { getEventGateForSymbol } from "./eventGate.js";
import { enrichCandidate, suppressionLabel } from "./ideaBrief.js";
import { getTradingProfile } from "./tradingProfile.js";

function parsePayload(row) {
  const p = row?.source_payload;
  if (!p) return {};
  if (typeof p === "string") {
    try {
      return JSON.parse(p);
    } catch {
      return {};
    }
  }
  return p;
}

function mapIdeaRow(row, focusId = null) {
  const payload = parsePayload(row);
  const direction =
    row.direction === "bullish"
      ? "LONG"
      : row.direction === "bearish"
        ? "SHORT"
        : "FLAT";
  const conf = Number(row.confidence);
  const grade =
    payload.grade ||
    (conf >= 78 && payload.alignment === "ALIGNED"
      ? "A"
      : conf >= 65
        ? "B"
        : "WATCH");
  return {
    id: row.id,
    asset: row.symbol,
    symbol: row.symbol,
    direction,
    side: direction,
    confidence: Number(row.confidence),
    entry_price: Number(row.entry_price),
    entryPrice: Number(row.entry_price),
    stop_loss: Number(row.stop_loss),
    stopLoss: Number(row.stop_loss),
    take_profit: Number(row.target_price),
    takeProfit: Number(row.target_price),
    target: Number(row.target_price),
    rationale: row.rationale,
    analysis: row.rationale,
    created_at: row.created_at,
    createdAt: row.created_at,
    confluence_score:
      payload.confluence_10 ?? confidenceToScale10(row.confidence),
    confluence_10:
      payload.confluence_10 ?? confidenceToScale10(row.confidence),
    trigger_interval: payload.trigger_interval || IDEA_TRIGGER_INTERVAL,
    trigger_label: payload.trigger_label || null,
    htf_trend: payload.htf_trend || null,
    ltf_trend: payload.ltf_trend || null,
    alignment: payload.alignment || null,
    source: payload.source || "technical",
    assetClass: getAssetClass(row.symbol),
    grade,
    confidence_tier: payload.confidence_tier || null,
    thesis: payload.thesis || null,
    invalidation_text: payload.invalidation_text || null,
    invalidation_price: payload.invalidation_price ?? null,
    time_stop: payload.time_stop || null,
    setup_type: payload.setup_type || null,
    veteran_bullets: payload.veteran_bullets || null,
    event_warning: payload.event_warning || false,
    event_blocked: payload.event_blocked || false,
    event_gate: payload.event_gate || null,
    is_todays_focus: focusId ? row.id === focusId : payload.is_todays_focus || false,
    structure_key: payload.structure_key || null,
  };
}

async function resolveFocusId(rows) {
  const mapped = rows.map((r) => mapIdeaRow(r));
  const a = mapped.filter((i) => i.grade === "A").sort((x, y) => y.confidence - x.confidence);
  const pick = a[0] || mapped.sort((x, y) => y.confidence - x.confidence)[0];
  return pick?.id || null;
}

export async function listIdeas(minConfidence = 0, assetClass = "all") {
  const symbols = getSymbolsByClass(assetClass);
  const params = [minConfidence];
  let sql = `SELECT * FROM trade_ideas WHERE confidence >= $1`;

  if (assetClass && assetClass !== "all" && symbols.length) {
    sql += ` AND symbol = ANY($2)`;
    params.push(symbols);
  }

  sql += ` ORDER BY created_at DESC LIMIT 80`;

  const { rows } = await query(sql, params);
  const focusId = await resolveFocusId(rows);
  return rows.map((r) => mapIdeaRow(r, focusId));
}

async function buildMarketContext() {
  const prices = await getAllPrices();
  const snapshots = [];

  for (const meta of ASSETS) {
    const { bars } = await getHistory(meta.asset, "4h", "1M");
    const tech = analyzeBars(bars);
    const p = prices[meta.asset];
    snapshots.push({
      symbol: meta.asset,
      price: p?.price,
      changePercent: p?.changePercent,
      htf: tech.htf.trend,
      ltf: tech.ltf.trend,
      bias: tech.bias,
      confidence: tech.confidence,
    });
  }

  return { asOf: new Date().toISOString(), assets: snapshots };
}

function payloadFromEnriched(c, source, suppressedBatch = null) {
  return {
    source,
    confluence_10: c.confluence_10,
    confidence_pct: c.confidence,
    trigger_interval: c.trigger_interval,
    trigger_label: c.trigger_label,
    htf_trend: c.htfTrend,
    ltf_trend: c.ltfTrend,
    alignment: c.alignment,
    htf_label: c.htf_label,
    structure_key: c.structure_key,
    grade: c.grade,
    confidence_tier: c.confidence_tier,
    thesis: c.thesis,
    invalidation_text: c.invalidation_text,
    invalidation_price: c.invalidation_price,
    time_stop: c.time_stop,
    setup_type: c.setup_type,
    veteran_bullets: c.veteran_bullets,
    event_warning: c.event_warning,
    event_blocked: c.event_blocked,
    event_gate: c.event_gate,
    is_todays_focus: c.grade === "A",
    ...(suppressedBatch ? { suppressed_batch: suppressedBatch } : {}),
  };
}

async function insertIdea(userId, idea, source = "technical") {
  const direction =
    idea.direction === "bullish" || idea.direction === "bearish"
      ? idea.direction
      : String(idea.direction || "").toLowerCase().includes("long") ||
          String(idea.direction || "").toLowerCase().includes("buy")
        ? "bullish"
        : "bearish";

  const { rows } = await query(
    `INSERT INTO trade_ideas (
       user_id, symbol, direction, confidence, entry_price, stop_loss, target_price, rationale, source_payload
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      userId,
      idea.symbol || idea.asset,
      direction,
      Math.min(99, Math.max(40, Number(idea.confidence) || 65)),
      idea.entry_price,
      idea.stop_loss,
      idea.target_price,
      idea.rationale || idea.thesis,
      JSON.stringify(
        idea.source_payload ||
          payloadFromEnriched(
            {
              ...idea,
              htfTrend: idea.htf_trend,
              ltfTrend: idea.ltf_trend,
              meta: { asset: idea.symbol || idea.asset, class: idea.assetClass },
            },
            source,
            suppressedBatch,
          ),
      ),
    ],
  );
  return mapIdeaRow(rows[0]);
}

async function generateTechnicalIdeas(userId) {
  const profile = await getTradingProfile(userId);
  const { candidates, scanned, skippedNeutral, prices } = await scanAllIdeaCandidates();

  const enriched = [];
  let eventBlocked = 0;

  for (const c of candidates) {
    const eventGate = await getEventGateForSymbol(
      c.meta.asset,
      profile.event_gate_minutes,
    );
    if (eventGate.blocked) {
      eventBlocked += 1;
      continue;
    }
    enriched.push(enrichCandidate(c, eventGate));
  }

  const { selected, suppressed } = diversifyIdeaCandidates(enriched);
  let pool = selected;
  let fallbackUsed = false;

  const suppressedMeta = suppressed.map((s) => ({
    ...s,
    label: suppressionLabel(s.reason),
  }));

  if (pool.length === 0) {
    const crypto = ASSETS.filter((a) => a.class === "crypto");
    const macro = ASSETS.filter((a) => a.class !== "crypto");
    let best = null;
    for (const meta of [...macro.slice(0, 6), ...crypto.slice(0, 4)]) {
      const { bars } = await getHistory(meta.asset, "4h", "1M");
      const tech = analyzeBars(bars);
      if (!best || tech.confidence > best.tech.confidence) {
        best = { meta, tech, bars };
      }
    }
    if (best) {
      const eventGate = await getEventGateForSymbol(
        best.meta.asset,
        profile.event_gate_minutes,
      );
      const c = await scanIdeaCandidate(best.meta, prices);
      if (c && !eventGate.blocked) pool = [enrichCandidate(c, eventGate)];
      else fallbackUsed = true;
    }
  }

  const created = [];
  const batchTag = suppressedMeta.length ? suppressedMeta : null;

  for (const c of pool) {
    created.push(
      await insertIdea(
        userId,
        {
          symbol: c.meta.asset,
          direction: c.bias,
          confidence: c.confidence,
          confluence_10: c.confluence_10,
          entry_price: c.entry,
          stop_loss: c.stop,
          target_price: c.target,
          rationale: c.thesis || c.rationale,
          source_payload: payloadFromEnriched(c, c.meta.class === "crypto" ? "binance-technical" : "technical", batchTag),
        },
        c.meta.class === "crypto" ? "binance-technical" : "technical",
      ),
    );
  }

  return {
    ideas: created,
    meta: {
      scanned,
      skippedNeutral,
      eventBlocked,
      fallbackUsed,
      diversifiedFrom: candidates.length,
      suppressed: suppressedMeta,
      provider: "technical",
      triggerInterval: IDEA_TRIGGER_INTERVAL,
    },
  };
}

function emptyGenerationMessage(meta) {
  if (meta?.eventBlocked > 0 && meta?.diversifiedFrom === 0) {
    return "High-impact macro events are too close — standing aside protects capital. Retry after the release window.";
  }
  if (meta?.skippedNeutral >= meta?.scanned) {
    return "Markets are mostly ranging (neutral bias) — no high-conviction setups right now. Try again after a session move.";
  }
  return "No new setups were saved. Try Generate again or check that the API and database are running.";
}

export async function generateIdeasDetailed(userId = null) {
  try {
    if (hasAnthropicKey()) {
      try {
        const context = await buildMarketContext();
        const aiIdeas = await generateTradeIdeasFromAI(context);
        const created = [];

        for (const idea of aiIdeas.slice(0, 8)) {
          if (!idea.symbol && !idea.asset) continue;
          created.push(
            await insertIdea(
              userId,
              {
                symbol: idea.symbol || idea.asset,
                direction: idea.direction,
                confidence: idea.confidence,
                entry_price: idea.entry_price,
                stop_loss: idea.stop_loss,
                target_price: idea.target_price,
                rationale: idea.rationale,
              },
              "anthropic",
            ),
          );
        }

        if (created.length) {
          return {
            ideas: created,
            meta: {
              provider: "anthropic",
              scanned: context.assets?.length || 0,
              count: created.length,
            },
          };
        }
      } catch (err) {
        console.warn("[ideas] Anthropic generation failed, using technical fallback:", err.message);
      }
    }

    const technical = await generateTechnicalIdeas(userId);
    return {
      ideas: technical.ideas,
      meta: {
        ...technical.meta,
        count: technical.ideas.length,
        emptyHint:
          technical.ideas.length === 0 ? emptyGenerationMessage(technical.meta) : null,
      },
    };
  } catch (err) {
    console.error("[ideas] generateIdeasDetailed failed:", err.message);
    return {
      ideas: [],
      meta: {
        provider: "technical",
        count: 0,
        emptyHint: emptyGenerationMessage({ skippedNeutral: 1, scanned: 1 }),
        error: err.message,
      },
    };
  }
}

export async function generateIdeas(userId = null) {
  const { ideas } = await generateIdeasDetailed(userId);
  return ideas;
}

export { getTechnicalAnalysis, mapIdeaRow };
