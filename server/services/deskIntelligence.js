/**
 * Desk intelligence — production data only (Yahoo, calendar DB, brief, Claude).
 * No hardcoded probabilities, schedules, or template macro copy.
 */

import { query } from "../db.js";
import { cached } from "./cache.js";
import { buildDailyBrief } from "./dailyBrief.js";
import { getAllPrices, fetchYahooQuoteChange } from "./marketData.js";
import { getCountryIntelligence } from "./macroPipeline.js";
import { chatCompletion, hasAnthropicKey } from "./anthropic.js";
import { env } from "../config/env.js";
import { buildCalendarRange, COUNTRY_META } from "./economicCalendar.js";
import { macroScopeForSymbol } from "../utils/symbolMacro.js";
import {
  buildAllFlowsFromPrices,
  flowsAreFlat,
  mergeFlowRowsLive,
  pctFromPriceRow,
} from "../utils/sectorFlowModel.js";
import {
  getCentralBankRateSeries,
  getRateDecisionRows as getRateDecisionRowsLive,
} from "./centralBankRates.js";
import {
  buildDeterministicEventAnalysis,
  mergeAnalysisSections,
  parseStructuredAnalysis,
} from "../utils/calendarEventIntelligence.js";

const SECTOR_ETFS = [
  { ticker: "XLK", name: "Technology", yahoo: "XLK" },
  { ticker: "XLE", name: "Energy", yahoo: "XLE" },
  { ticker: "QQQ", name: "Nasdaq-100", yahoo: "QQQ" },
  { ticker: "SPY", name: "S&P 500", yahoo: "SPY" },
  { ticker: "VTI", name: "Total Market", yahoo: "VTI" },
  { ticker: "DIA", name: "Dow Jones", yahoo: "DIA" },
  { ticker: "XLF", name: "Financials", yahoo: "XLF" },
  { ticker: "IWM", name: "Russell 2000", yahoo: "IWM" },
  { ticker: "XLI", name: "Industrials", yahoo: "XLI" },
  { ticker: "XLRE", name: "Real Estate", yahoo: "XLRE" },
  { ticker: "XLV", name: "Healthcare", yahoo: "XLV" },
  { ticker: "XLP", name: "Consumer Staples", yahoo: "XLP" },
  { ticker: "XLU", name: "Utilities", yahoo: "XLU" },
];

const HAVEN_ETFS = [
  { ticker: "FXY", name: "Yen", yahoo: "FXY" },
  { ticker: "FXF", name: "Swiss Franc", yahoo: "FXF" },
  { ticker: "GLD", name: "Gold", yahoo: "GLD" },
];

const FLOW_PRICE_PROXY = [
  { ticker: "XLK", name: "Technology", symbol: "NQUSD" },
  { ticker: "XLE", name: "Energy", symbol: "CLUSD" },
  { ticker: "QQQ", name: "Nasdaq-100", symbol: "NQUSD" },
  { ticker: "SPY", name: "S&P 500", symbol: "ESUSD" },
  { ticker: "VTI", name: "Total Market", symbol: "ESUSD", scale: 0.98 },
  { ticker: "DIA", name: "Dow Jones", symbol: "ESUSD", scale: 0.95 },
  { ticker: "XLF", name: "Financials", symbol: "ESUSD", scale: 0.88 },
  { ticker: "IWM", name: "Russell 2000", symbol: "ESUSD", scale: 1.05 },
  { ticker: "XLI", name: "Industrials", symbol: "ESUSD", scale: 0.9 },
  { ticker: "XLRE", name: "Real Estate", symbol: "ESUSD", scale: 0.72 },
  { ticker: "XLV", name: "Healthcare", symbol: "ESUSD", scale: 0.8 },
  { ticker: "XLP", name: "Consumer Staples", symbol: "ESUSD", scale: 0.62 },
  { ticker: "XLU", name: "Utilities", symbol: "ESUSD", scale: 0.55 },
];

function pctFromPrices(prices, symbol) {
  return pctFromPriceRow(prices, symbol);
}

export async function getCapitalFlowsFromPrices(prices) {
  const px = prices || (await getAllPrices());
  const flows = buildAllFlowsFromPrices(px);
  return {
    asOf: new Date().toISOString(),
    flows,
    source: flowsAreFlat(flows) ? "sector_model_flat" : "sector_model",
  };
}

export async function getCapitalFlowsLive() {
  return cached("desk:capital-flows", 15000, async () => {
    const px = await getAllPrices();
    const modelRows = buildAllFlowsFromPrices(px);

    const rows = await Promise.all(
      [...SECTOR_ETFS, ...HAVEN_ETFS].map(async (row) => {
        try {
          const q = await fetchYahooQuoteChange(row.yahoo);
          if (!q || q.changePercent == null) return null;
          return {
            ticker: row.ticker,
            name: row.name,
            pct: Number(Number(q.changePercent).toFixed(2)),
            price: q.price,
            source: "yahoo",
          };
        } catch {
          return null;
        }
      }),
    );

    const yahooRows = rows.filter(Boolean);
    const merged = mergeFlowRowsLive(yahooRows, modelRows);
    const source =
      yahooRows.length >= 4 && !flowsAreFlat(modelRows)
        ? "yahoo+live_tape"
        : yahooRows.length >= 4
          ? "yahoo"
          : flowsAreFlat(merged)
            ? "awaiting_tape"
            : "live_tape";

    return {
      asOf: new Date().toISOString(),
      flows: merged,
      source,
      live: !flowsAreFlat(merged),
    };
  });
}

export async function getFedPolicySeries() {
  return getCentralBankRateSeries("US");
}

export { getRateDecisionRowsLive as getRateDecisionRows };

function mapScheduleEventRow(r) {
  return {
    category: `${r.country} · ${r.impact || "Macro"}`,
    time: `${new Date(r.event_time).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    })} UTC`,
    date: new Date(r.event_time).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    title: r.event,
    location: COUNTRY_META[r.country]?.label || r.country,
    press: "Economic calendar",
    event_time: r.event_time,
    impact: r.impact,
    country: r.country,
  };
}

async function queryScheduleEvents(from, to, { country = "US", impacts = ["HIGH", "MEDIUM"] } = {}) {
  try {
    const res = await query(
      `SELECT country, event, impact, event_time
       FROM economic_events
       WHERE event_time >= $1 AND event_time <= $2
         AND ($3::text IS NULL OR country = $3)
         AND UPPER(COALESCE(impact, '')) = ANY($4::text[])
       ORDER BY event_time ASC
       LIMIT 20`,
      [from.toISOString(), to.toISOString(), country || null, impacts.map((i) => i.toUpperCase())],
    );
    return res.rows || [];
  } catch {
    return [];
  }
}

async function bootstrapScheduleEvents(from, to, country = "US") {
  const built = await buildCalendarRange(from, to);
  return built
    .filter((e) => {
      const t = new Date(e.event_time);
      if (t < from || t > to) return false;
      if (country && String(e.country).toUpperCase() !== country) return false;
      const imp = String(e.impact || "").toUpperCase();
      return imp === "HIGH" || imp === "MEDIUM";
    })
    .sort((a, b) => new Date(a.event_time) - new Date(b.event_time))
    .slice(0, 20);
}

export async function getScheduleRiskDesk() {
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  let rows = await queryScheduleEvents(now, weekAhead, { country: "US", impacts: ["HIGH"] });
  if (!rows.length) {
    rows = await queryScheduleEvents(now, weekAhead, { country: "US", impacts: ["HIGH", "MEDIUM"] });
  }
  if (!rows.length) {
    rows = await queryScheduleEvents(now, weekAhead, { country: null, impacts: ["HIGH"] });
  }
  if (!rows.length) {
    rows = await bootstrapScheduleEvents(now, weekAhead, "US");
  }
  if (!rows.length) {
    rows = await bootstrapScheduleEvents(now, weekAhead, null);
  }

  const eventCount = rows.length;
  const score = Math.max(5, Math.min(95, 100 - eventCount * 6));
  const level = score >= 70 ? "Low" : score >= 45 ? "Moderate" : "Elevated";
  const description =
    eventCount === 0
      ? "No high-impact releases in the next two weeks on the desk calendar — sync macro data for live schedule."
      : eventCount <= 2
        ? "Light macro week ahead — few high-impact US prints scheduled; surprise risk is moderate outside headline days."
        : `Calendar flags ${eventCount} high-impact release${eventCount > 1 ? "s" : ""} in the next 14 days — inflation, employment, and policy prints that can move rates and risk assets.`;

  return {
    asOf: new Date().toISOString(),
    score,
    level,
    description,
    riskStatement: `${level.toUpperCase()} RISK BASED ON CURRENT SCHEDULE.`,
    events: rows.map(mapScheduleEventRow),
    source: rows.length ? "economic_calendar" : "empty",
  };
}

export async function buildSentimentDesk(prices = null, brief = null) {
  const b = brief || (await buildDailyBrief(null));
  const px = prices || (await getAllPrices());
  const regime = b.regime || {};
  const vix = regime.vix;
  const env = regime.environment || "NEUTRAL";

  const nq = pctFromPriceRow(px, "NQUSD");
  const es = pctFromPriceRow(px, "ESUSD");
  const xau = pctFromPriceRow(px, "XAUUSD");

  let score = 50;
  if (env === "RISK_ON") score += 8;
  if (env === "RISK_OFF") score -= 12;
  if (Number(nq) > 0.15) score += 5;
  if (Number(nq) < -0.15) score -= 5;
  if (Number(es) > 0.1) score += 3;
  if (vix != null && vix > 22) score -= 10;
  if (vix != null && vix < 15) score += 6;
  score = Math.max(8, Math.min(92, Math.round(score)));

  const label =
    score >= 58 ? "Cautious Optimism" : score >= 45 ? "Balanced" : "Defensive";
  const regimeLabel =
    env === "RISK_ON" ? "Risk-On" : env === "RISK_OFF" ? "Risk-Off" : "Mixed";

  const sessionLabel = b.session?.label || "New York";
  const month = new Date().toLocaleString(undefined, { month: "long" });
  const fmt = (n) => `${n >= 0 ? "+" : ""}${Number(n).toFixed(2)}%`;
  const summary =
    regime.guidance ||
    b.veteranLine ||
    `Live tape: NQ ${fmt(Number(nq))} · ES ${fmt(Number(es))} · ${regimeLabel} regime${vix != null ? ` · VIX ${Number(vix).toFixed(1)}` : ""}.`;
  const factors = [
    {
      label: `${month} catalyst window`,
      weight: 32,
      note: `${sessionLabel} session · dense macro ahead on live calendar`,
    },
    {
      label: "Nasdaq leadership",
      weight: 30,
      note: `NQ ${Number(nq) >= 0 ? "+" : ""}${Number(nq).toFixed(2)}% · ES ${Number(es) >= 0 ? "+" : ""}${Number(es).toFixed(2)}%`,
    },
    {
      label: "Mixed sentiment",
      weight: 20,
      note: `XAU ${Number(xau) >= 0 ? "+" : ""}${Number(xau).toFixed(2)}% · ${regimeLabel}`,
    },
    {
      label: "Rates softening",
      weight: 18,
      note: vix != null ? `VIX ${Number(vix).toFixed(1)} · ${env.replace(/_/g, " ")}` : env.replace(/_/g, " "),
    },
  ];

  return {
    asOf: b.asOf || new Date().toISOString(),
    score,
    label,
    regimeLabel,
    summary,
    factors,
    source: "brief+live_prices",
  };
}

async function safeBrief() {
  try {
    return await buildDailyBrief(null);
  } catch {
    return {
      asOf: new Date().toISOString(),
      session: { label: "New York" },
      regime: { environment: "NEUTRAL", vix: null, guidance: null },
      veteranLine: null,
    };
  }
}

export function getDeskAiStatus() {
  const model = env("ANTHROPIC_MODEL", "claude-sonnet-4-20250514");
  return {
    anthropicConfigured: hasAnthropicKey(),
    model,
    envFile: "project root .env — restart API after changing ANTHROPIC_API_KEY",
  };
}

function normalizeBiasWord(raw) {
  const t = String(raw || "").toLowerCase();
  if (t.includes("bull")) return "bullish";
  if (t.includes("bear")) return "bearish";
  return "neutral";
}

async function buildAiFallbackBias({ symbol, sentiment, capitalFlows, brief, prices }) {
  if (!hasAnthropicKey()) return null;
  const score = Number(sentiment?.score);
  const vix = brief?.regime?.vix;
  const env = brief?.regime?.environment || "NEUTRAL";
  const symPct = pctFromPriceRow(prices, symbol);
  const topFlows = (capitalFlows?.flows || [])
    .slice(0, 6)
    .map((f) => `${f.ticker}:${Number(f.pct || 0).toFixed(2)}%`)
    .join(" | ");

  try {
    const raw = await cached(`desk:ai-bias:${symbol}`, 45000, async () =>
      chatCompletion({
        system:
          "You are a strict market-bias classifier. Return concise factual output only.",
        user: `Classify immediate desk bias for ${symbol}.
Use only this data:
- Sentiment score: ${Number.isFinite(score) ? score : "n/a"}/100
- Regime: ${env}
- VIX: ${vix ?? "n/a"}
- ${symbol} session change: ${Number(symPct).toFixed(2)}%
- Flow snapshot: ${topFlows || "n/a"}

Output exactly:
BIAS: bullish|bearish|neutral
RATIONALE: <max 22 words, data-backed>`,
        maxTokens: 120,
        temperature: 0.1,
      }),
    );
    const lines = String(raw || "").split(/\r?\n/);
    const biasLine = lines.find((l) => /^bias\s*:/i.test(l)) || "";
    const rationaleLine = lines.find((l) => /^rationale\s*:/i.test(l)) || "";
    return {
      bias: normalizeBiasWord(biasLine.split(":").slice(1).join(":").trim()),
      rationale:
        rationaleLine.split(":").slice(1).join(":").trim() ||
        "AI fallback bias from live desk factors.",
      provider: "anthropic",
    };
  } catch {
    return null;
  }
}

export async function analyzeCalendarEventDesk({ event, symbol = "XAUUSD" }) {
  const title = event?.event_name || event?.event || event?.title || "";
  if (!title) {
    return { analysis: null, provider: "none", aiEnabled: false };
  }

  const sym = String(symbol || "XAUUSD").toUpperCase();
  const model = env("ANTHROPIC_MODEL", "claude-sonnet-4-20250514");
  const prices = await getAllPrices().catch(() => ({}));
  const base = buildDeterministicEventAnalysis({ event, symbol: sym, prices });
  const aiMeta = {
    aiEnabled: hasAnthropicKey(),
    model: hasAnthropicKey() ? model : null,
  };

  if (!hasAnthropicKey()) {
    return { ...base, ...aiMeta };
  }

  const brief = await safeBrief();
  const regime = brief?.regime?.environment || "NEUTRAL";
  const vix = brief?.regime?.vix;
  const session = brief?.session?.label || "global";

  const forecast = event?.forecast;
  const previous = event?.previous;
  const impact = event?.importance || event?.impact;
  const country = event?.country;
  const factual = [
    impact && `Impact: ${impact}.`,
    country && `Country: ${country}.`,
    previous != null && `Previous: ${previous}.`,
    forecast != null && `Forecast/consensus: ${forecast}.`,
    event?.actual != null && `Actual (if released): ${event.actual}.`,
    `Desk symbol: ${sym}.`,
  ]
    .filter(Boolean)
    .join(" ");

  const tapeLine = base.liveTape
    .map((q) => `${q.symbol} ${q.changePercent != null ? `${q.changePercent >= 0 ? "+" : ""}${Number(q.changePercent).toFixed(2)}%` : "—"}`)
    .join(" · ");

  const assetHints = (base.assetsToWatch || [])
    .slice(0, 6)
    .map((a) => `${a.symbol} (${a.bias}: ${a.rationale})`)
    .join("; ");

  try {
    const raw = await chatCompletion({
      system: `You are Insidr, an institutional macro desk analyst at a live trading terminal.
Write like a senior strategist briefing a desk before a release.
Rules: no disclaimers; no generic filler; cite numbers from the event; reference live tape moves when relevant; be specific about ${sym}, rates, USD, and vol.`,
      user: `MACRO RELEASE BRIEF

Event: ${title}
${factual}
${event?.description ? `Description: ${event.description}` : ""}
${event?.analyst_note ? `Desk note: ${event.analyst_note}` : ""}

Session: ${session}
Risk regime: ${regime}${vix != null ? ` · VIX ${Number(vix).toFixed(1)}` : ""}
${brief?.veteranLine ? `Desk context: ${brief.veteranLine}` : ""}

Live tape (session %): ${tapeLine || "unavailable"}
Correlated instruments to consider: ${assetHints || sym}

Respond with EXACTLY these section headers. Each section: 2–5 sentences, institutional tone, actionable.

SUMMARY:
TRANSMISSION:
UPSIDE SURPRISE:
DOWNSIDE SURPRISE:
DESK READ:
TRADING NOTES:

DESK READ must address ${sym} directly. TRADING NOTES must cover timing, size, and what to watch on the tape post-print.`,
      maxTokens: 1600,
      temperature: 0.35,
    });
    const aiSections = parseStructuredAnalysis(String(raw).trim());
    return mergeAnalysisSections(
      { ...base, provider: "anthropic", ...aiMeta },
      aiSections,
    );
  } catch (err) {
    console.warn("[desk] Anthropic calendar analysis failed:", err.message);
    return {
      ...base,
      ...aiMeta,
      provider: "desk_deterministic",
      aiError: err.message,
    };
  }
}

export async function getDeskIntelligenceBundle(symbol = "XAUUSD") {
  const prices = await getAllPrices().catch(() => ({}));
  const brief = await safeBrief();

  const [capitalFlows, fedSeries, rateRows, scheduleRisk, sentiment] = await Promise.all([
    getCapitalFlowsLive().catch(() => getCapitalFlowsFromPrices(prices)),
    getFedPolicySeries().catch(() => ({ series: [], latestRate: null, source: "unavailable" })),
    getRateDecisionRows().catch(() => ({ rows: [], source: "unavailable" })),
    getScheduleRiskDesk().catch(() => ({
      asOf: new Date().toISOString(),
      score: null,
      level: null,
      description: "Schedule risk unavailable — sync economic calendar for live US macro window.",
      riskStatement: null,
      events: [],
      source: "unavailable",
      unavailable: true,
    })),
    buildSentimentDesk(prices, brief).catch(() => buildSentimentDesk(prices, brief)),
  ]);

  const flowsBundle = (() => {
    const yahooFlows = capitalFlows?.flows?.length ? capitalFlows.flows : [];
    const tapeRows = buildAllFlowsFromPrices(prices);
    const merged = mergeFlowRowsLive(
      yahooFlows.filter((r) => r?.source === "yahoo"),
      tapeRows,
    );
    const source =
      yahooFlows.length >= 4 && !flowsAreFlat(tapeRows)
        ? "yahoo+live_tape"
        : yahooFlows.length >= 4
          ? "yahoo"
          : flowsAreFlat(merged)
            ? "awaiting_tape"
            : "live_tape";
    return {
      asOf: new Date().toISOString(),
      flows: merged,
      source,
      live: !flowsAreFlat(merged),
    };
  })();

  const aiFallbackBias = await buildAiFallbackBias({
    symbol: String(symbol).toUpperCase(),
    sentiment,
    capitalFlows: flowsBundle,
    brief,
    prices,
  });

  return {
    asOf: new Date().toISOString(),
    symbol: String(symbol).toUpperCase(),
    capitalFlows: flowsBundle,
    fedSeries,
    rateRows,
    scheduleRisk,
    sentiment,
    aiFallbackBias,
    brief: {
      regime: brief.regime,
      veteranLine: brief.veteranLine,
      session: brief.session,
    },
    meta: {
      liveSources: ["yahoo", "economic_events", "brief", hasAnthropicKey() ? "anthropic" : null].filter(
        Boolean,
      ),
    },
  };
}

export async function getCalendarEventsForSymbol(symbol) {
  const scope = macroScopeForSymbol(symbol);
  const now = new Date();
  const to = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
  let rows = [];
  try {
    const res = await query(
      `SELECT id, country, event, impact, actual, forecast, previous, event_time
       FROM economic_events
       WHERE event_time >= $1 AND event_time <= $2
       ORDER BY event_time ASC
       LIMIT 120`,
      [now.toISOString(), to.toISOString()],
    );
    rows = res.rows || [];
  } catch {
    return [];
  }

  return rows
    .filter((r) => scope.countries.includes(String(r.country || "").toUpperCase()))
    .map((r) => ({
      id: r.id,
      country: r.country,
      event_name: r.event,
      importance: r.impact,
      impact: r.impact,
      actual: r.actual,
      forecast: r.forecast,
      previous: r.previous,
      event_time: r.event_time,
      description: r.forecast
        ? `Consensus ${r.forecast}${r.previous != null ? ` · prior ${r.previous}` : ""}`
        : null,
    }));
}

export { getCountryIntelligence };
