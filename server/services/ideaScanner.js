import { ASSETS } from "../config/assets.js";
import { getHistory, getAllPrices } from "./marketData.js";
import { combineTimeframeTrends, levelsFromBars, trendOfSeries } from "./technical.js";
import {
  formatTfLabel,
  resolveTimeframeStack,
} from "../utils/timeframeStack.js";

/** Execution / trigger timeframe shown on cards */
export const IDEA_TRIGGER_INTERVAL = "15m";
export const IDEA_TRIGGER_PERIOD = "1W";

export function confidenceToScale10(confidence) {
  const pct = Number(confidence) || 50;
  return Math.min(10, Math.max(1, Math.round((pct / 10) * 10) / 10));
}

export function buildIdeaRationale(meta, ctx) {
  const {
    htfTrend,
    ltfTrend,
    bias,
    confidence,
    alignment,
    triggerLabel,
    htfLabel,
    srcLabel,
  } = ctx;
  const alignNote =
    alignment === "CONFLICTING"
      ? "HTF/chart divergence — size down"
      : alignment === "ALIGNED"
        ? "timeframes aligned"
        : "mixed structure";

  return `${meta.asset} (${meta.class}, ${srcLabel}): Trigger ${triggerLabel} ${ltfTrend} · Structure ${htfLabel} ${htfTrend}. ${bias} bias, ${confidence}% confidence (${alignNote}).`;
}

/**
 * Scan one symbol with multi-TF logic (trigger TF vs higher structure).
 */
export async function scanIdeaCandidate(meta, prices) {
  const stack = resolveTimeframeStack(IDEA_TRIGGER_INTERVAL, IDEA_TRIGGER_PERIOD);
  const [chartLoad, htfLoad] = await Promise.all([
    getHistory(meta.asset, IDEA_TRIGGER_INTERVAL, IDEA_TRIGGER_PERIOD),
    getHistory(meta.asset, stack.htf.interval, stack.htf.period),
  ]);
  const chartBars = chartLoad.bars;
  const htfBars = htfLoad.bars;

  const htfTrend = trendOfSeries(htfBars);
  const ltfTrend = trendOfSeries(chartBars);
  const combined = combineTimeframeTrends(htfTrend, ltfTrend);

  if (combined.bias === "neutral") return null;

  const { entry, stop, target } = levelsFromBars(chartBars, combined.bias);
  const priceSnap = prices[meta.asset]?.price || entry;
  const confidence = combined.confidence;
  const triggerLabel = `${formatTfLabel(IDEA_TRIGGER_INTERVAL)} · ${IDEA_TRIGGER_PERIOD}`;
  const htfLabel = `${formatTfLabel(stack.htf.interval)} · ${stack.htf.period}`;
  const srcLabel = meta.class === "crypto" ? "Binance" : "market";

  return {
    meta,
    bias: combined.bias,
    confidence,
    confluence_10: confidenceToScale10(confidence),
    htfTrend,
    ltfTrend,
    alignment: combined.alignment,
    entry: priceSnap,
    stop,
    target,
    trigger_interval: IDEA_TRIGGER_INTERVAL,
    trigger_period: IDEA_TRIGGER_PERIOD,
    trigger_label: triggerLabel,
    htf_label: htfLabel,
    rationale: buildIdeaRationale(meta, {
      htfTrend,
      ltfTrend,
      bias: combined.bias,
      confidence,
      alignment: combined.alignment,
      triggerLabel,
      htfLabel,
      srcLabel,
    }),
    structure_key: `${meta.class}:${combined.bias}:${htfTrend}:${ltfTrend}`,
  };
}

/**
 * Limit correlated exposure — one narrative bucket per crypto structure, cap per direction.
 */
export function diversifyIdeaCandidates(candidates, limits = {}) {
  const {
    maxTotal = 8,
    maxCryptoPerDirection = 2,
    maxMacroPerDirection = 4,
    maxPerStructureKey = 1,
  } = limits;

  const sorted = [...candidates].sort((a, b) => b.confidence - a.confidence);
  const selected = [];
  const suppressed = [];
  const cryptoByDir = { bullish: 0, bearish: 0 };
  const macroByDir = { bullish: 0, bearish: 0 };
  const structureHits = new Map();

  for (const c of sorted) {
    const dir = c.bias;
    const isCrypto = c.meta.class === "crypto";
    let reason = null;

    if (selected.length >= maxTotal) reason = "session_cap";
    else if (isCrypto && cryptoByDir[dir] >= maxCryptoPerDirection)
      reason = "crypto_direction_cap";
    else if (!isCrypto && macroByDir[dir] >= maxMacroPerDirection)
      reason = "macro_direction_cap";
    else {
      const sk = c.structure_key;
      const skCount = structureHits.get(sk) || 0;
      if (isCrypto && skCount >= maxPerStructureKey) reason = "structure_duplicate";
    }

    if (reason) {
      suppressed.push({
        symbol: c.meta.asset,
        confidence: c.confidence,
        bias: c.bias,
        reason,
        structure_key: c.structure_key,
      });
      continue;
    }

    const sk = c.structure_key;
    structureHits.set(sk, (structureHits.get(sk) || 0) + 1);
    if (isCrypto) cryptoByDir[dir] += 1;
    else macroByDir[dir] += 1;
    selected.push(c);
  }

  return { selected, suppressed };
}

export async function scanAllIdeaCandidates() {
  const prices = await getAllPrices();
  const crypto = ASSETS.filter((a) => a.class === "crypto");
  const macro = ASSETS.filter((a) => a.class !== "crypto");
  const scanList = [...macro.slice(0, 10), ...crypto];
  const candidates = [];
  let scanned = 0;
  let skippedNeutral = 0;

  for (const meta of scanList) {
    scanned += 1;
    const c = await scanIdeaCandidate(meta, prices);
    if (!c) {
      skippedNeutral += 1;
      continue;
    }
    candidates.push(c);
  }

  return { candidates, scanned, skippedNeutral, prices };
}
