import { cached } from "./cache.js";
import { listIdeas } from "./ideaEngine.js";
import { getTradingProfile, computeBookHeat } from "./tradingProfile.js";
import { getScorecard } from "./scorecard.js";
import { query } from "../db.js";

function currentSession() {
  const h = new Date().getUTCHours();
  if (h >= 7 && h < 12) return { id: "london", label: "London", tone: "active" };
  if (h >= 12 && h < 21) return { id: "new_york", label: "New York", tone: "active" };
  if (h >= 0 && h < 7) return { id: "asia", label: "Asia", tone: "quiet" };
  return { id: "off_hours", label: "Off-hours", tone: "quiet" };
}

async function fetchRiskRegime() {
  try {
    const vixUrl =
      "https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=5d";
    const res = await fetch(vixUrl, { headers: { "User-Agent": "INSIDR/1.0" } });
    const json = await res.json();
    const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
    const vix = closes.filter((c) => c != null).pop();
    const level = vix != null ? Number(vix) : 18.5;
    let environment = "NEUTRAL";
    let guidance = "Balanced book — take only graded setups.";
    if (level < 16) {
      environment = "RISK_ON";
      guidance = "Low fear regime — trends can extend; still respect heat limits.";
    } else if (level >= 24) {
      environment = "RISK_OFF";
      guidance = "Elevated fear — prefer A-grade only and reduce correlated crypto.";
    }
    return { environment, vix: level, guidance };
  } catch {
    return {
      environment: "NEUTRAL",
      vix: null,
      guidance: "Macro gauge unavailable — rely on your book heat and event gate.",
    };
  }
}

function pickFocus(ideas) {
  const graded = ideas.filter((i) => i.grade === "A");
  const pool = graded.length ? graded : ideas.filter((i) => i.grade === "B");
  if (!pool.length) return null;
  return pool.sort((a, b) => Number(b.confidence) - Number(a.confidence))[0];
}

export async function buildDailyBrief(userId = null) {
  const session = currentSession();
  const regime = await cached("brief:risk-regime", 120000, fetchRiskRegime);
  const profile = await getTradingProfile(userId);
  const ideas = await listIdeas(0, "all");
  const focus = pickFocus(ideas);
  const watch = ideas.filter((i) => i.id !== focus?.id && (i.grade === "B" || i.grade === "WATCH")).slice(0, 4);
  const heat = userId ? await computeBookHeat(userId, profile) : null;
  const scorecard = await getScorecard(userId);

  let lastSuppressed = [];
  try {
    const { rows } = await query(
      `SELECT source_payload FROM trade_ideas
       WHERE source_payload ? 'suppressed_batch'
       ORDER BY created_at DESC LIMIT 1`,
    );
    if (rows[0]?.source_payload?.suppressed_batch) {
      lastSuppressed = rows[0].source_payload.suppressed_batch;
    }
  } catch {
  }

  const sitOut = !focus && ideas.length === 0;
  const sitOutSoft = !focus && ideas.length > 0;

  return {
    asOf: new Date().toISOString(),
    session,
    regime,
    todaysFocus: focus ? { ...focus, is_todays_focus: true } : null,
    watchList: watch,
    sitOut,
    sitOutMessage: sitOut
      ? "No A+ setup right now — capital preserved is a win. Check again after London or NY momentum."
      : sitOutSoft
        ? "No A-grade focus — review Watch list only or wait for a cleaner trigger."
        : null,
    bookHeat: heat,
    profile,
    scorecard,
    ideaCount: ideas.length,
    lastSuppressed,
    veteranLine: focus
      ? focus.thesis || focus.rationale
      : sitOut
        ? "Stand aside until structure and trigger align on at least one instrument."
        : watch[0]?.thesis || "Scan complete — no primary focus; size down on Watch grades.",
  };
}
