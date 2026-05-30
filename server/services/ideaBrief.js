import { formatTfLabel } from "../utils/timeframeStack.js";
import { IDEA_TRIGGER_INTERVAL } from "./ideaScanner.js";

export function assignGrade({ confidence, alignment, eventGate }) {
  if (eventGate?.blocked) return "WATCH";
  const conf = Number(confidence) || 0;
  if (conf >= 78 && alignment === "ALIGNED") return "A";
  if (conf >= 70 || (conf >= 65 && alignment === "ALIGNED")) return "B";
  if (eventGate?.warning) return "WATCH";
  return "WATCH";
}

export function setupTypeFromContext({ alignment, bias, ltfTrend, htfTrend }) {
  if (alignment === "CONFLICTING") return "Divergence play — reduced size";
  if (alignment === "ALIGNED") return "Trend continuation";
  if (String(ltfTrend).includes("BULL") && String(htfTrend).includes("BEAR")) {
    return "Counter-trend bounce";
  }
  if (String(ltfTrend).includes("BEAR") && String(htfTrend).includes("BULL")) {
    return "Pullback fade";
  }
  return bias === "bullish" ? "Break & retest long" : "Break & retest short";
}

export function buildVeteranBrief(candidate, eventGate = null) {
  const asset = candidate.meta?.asset || candidate.symbol;
  const bias = candidate.bias;
  const dir = bias === "bullish" ? "LONG" : "SHORT";
  const triggerLabel =
    candidate.trigger_label ||
    `${formatTfLabel(candidate.trigger_interval || IDEA_TRIGGER_INTERVAL)}`;
  const invalidation = candidate.stop;
  const alignment = candidate.alignment;

  const thesis = `${dir} ${asset}: ${setupTypeFromContext(candidate)} on ${triggerLabel} with structure ${candidate.htf_label || "HTF"} ${candidate.htfTrend}.`;

  const invalidationText =
    bias === "bullish"
      ? `Invalid if price closes below ${Number(invalidation).toFixed(5)} (stop).`
      : `Invalid if price closes above ${Number(invalidation).toFixed(5)} (stop).`;

  const timeStop =
    candidate.meta?.class === "crypto"
      ? "If target not reached within 24h, reduce size or scratch."
      : "If no progress in 2 sessions, stand aside.";

  let eventNote = null;
  if (eventGate?.nextEvent) {
    const ev = eventGate.nextEvent;
    eventNote = `${ev.name} (${ev.country}) in ${eventGate.minutesUntil}m — ${
      eventGate.blocked ? "avoid new entries" : "size down"
    }.`;
  }

  const grade = assignGrade({
    confidence: candidate.confidence,
    alignment,
    eventGate,
  });

  const bullets = [
    `Thesis: ${thesis}`,
    `Trigger: ${triggerLabel} · chart ${candidate.ltfTrend}`,
    invalidationText,
    timeStop,
  ];
  if (eventNote) bullets.push(eventNote);

  return {
    grade,
    thesis,
    invalidation_text: invalidationText,
    invalidation_price: invalidation,
    time_stop: timeStop,
    setup_type: setupTypeFromContext(candidate),
    veteran_bullets: bullets,
    event_gate: eventGate,
    confidence_tier:
      grade === "A" ? "High" : grade === "B" ? "Medium" : "Watch",
  };
}

export function suppressionLabel(reason) {
  const map = {
    session_cap: "Session idea limit reached",
    crypto_direction_cap: "Max crypto exposure this direction",
    macro_direction_cap: "Max macro exposure this direction",
    structure_duplicate: "Duplicate structure — higher-confidence pick kept",
  };
  return map[reason] || "Diversification filter";
}

export function enrichCandidate(candidate, eventGate) {
  const brief = buildVeteranBrief(candidate, eventGate);
  return {
    ...candidate,
    ...brief,
    event_warning: eventGate?.warning || false,
    event_blocked: eventGate?.blocked || false,
  };
}
