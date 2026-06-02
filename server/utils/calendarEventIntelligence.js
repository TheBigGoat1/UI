/**
 * Calendar event → structured desk analysis (deterministic + AI section parsing).
 */

import {
  classifyHeadline,
  inferHeadlineAssets,
} from "./headlineIntelligence.js";

const SECTION_KEYS = [
  ["summary", "SUMMARY"],
  ["transmission", "TRANSMISSION"],
  ["upsideSurprise", "UPSIDE SURPRISE"],
  ["downsideSurprise", "DOWNSIDE SURPRISE"],
  ["deskRead", "DESK READ"],
  ["tradingNotes", "TRADING NOTES"],
];

export function parseStructuredAnalysis(raw = "") {
  const text = String(raw || "").trim();
  const sections = {};
  if (!text) return sections;

  const upper = text.toUpperCase();
  const markers = SECTION_KEYS.map(([id, label]) => ({
    id,
    label,
    index: upper.indexOf(`${label}:`),
  })).filter((m) => m.index >= 0);

  if (markers.length === 0) {
    sections.summary = text;
    return sections;
  }

  markers.sort((a, b) => a.index - b.index);
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index + markers[i].label.length + 1;
    const end = i + 1 < markers.length ? markers[i + 1].index : text.length;
    const chunk = text.slice(start, end).trim();
    if (chunk) sections[markers[i].id] = chunk;
  }
  return sections;
}

function parseNumeric(val) {
  if (val == null || val === "") return null;
  const s = String(val).replace(/%/g, "").replace(/,/g, "").trim();
  const m = s.match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function buildSurpriseScenarios({ title, forecast, previous }) {
  const t = String(title || "").toLowerCase();
  const fc = parseNumeric(forecast);
  const prev = parseNumeric(previous);
  const isRate =
    /\b(rate|fomc|fed funds|bank rate|ecb|boe|boj|rbnz|rba|boc|policy)\b/i.test(t);
  const isClaims = /\b(jobless|claims|unemployment|nfp|payroll)\b/i.test(t);
  const isInflation = /\b(cpi|ppi|pce|inflation)\b/i.test(t);
  const isPmi = /\b(pmi|ism|manufacturing|services)\b/i.test(t);

  if (isRate && fc != null) {
    return {
      upsideSurprise: `Print above ${forecast} (hawkish vs consensus) — front-end yields and ${"USD"} typically firm; duration-sensitive risk assets face headwinds.`,
      downsideSurprise: `Print below ${forecast} (dovish vs consensus) — yields soften, USD often eases, gold and growth beta can catch a bid on the first move.`,
    };
  }
  if (isClaims && fc != null) {
    return {
      upsideSurprise: `Claims below forecast (${forecast}) — labor tightness narrative; supports risk-on tone unless paired with hot wages.`,
      downsideSurprise: `Claims above forecast — growth scare; vol and havens bid, cyclicals lag on the impulse.`,
    };
  }
  if (isInflation && fc != null) {
    return {
      upsideSurprise: `Hotter than ${forecast} — repricing of Fed/central-bank path; USD and real-yield proxies lead, equities volatile.`,
      downsideSurprise: `Cooler than ${forecast} — disinflation relief; yields dip, risk assets often squeeze shorts intraday.`,
    };
  }
  if (isPmi && fc != null) {
    const expansion = fc >= 50;
    return {
      upsideSurprise: `Beat ${forecast}${expansion ? " and hold/expansion zone (>50)" : ""} — cyclical bid, USD mixed vs global PMIs; watch energy and industrials beta.`,
      downsideSurprise: `Miss ${forecast}${expansion ? "" : " or slip toward contraction"} — growth worry, defensive rotation and vol uptick common in first 15–30m.`,
    };
  }

  if (fc != null && prev != null) {
    const dir = fc > prev ? "higher" : fc < prev ? "lower" : "inline";
    return {
      upsideSurprise: `Beat consensus (${forecast}) vs street ${dir} revision path from prior ${previous} — first move follows surprise magnitude; fade risk if liquidity thin.`,
      downsideSurprise: `Miss consensus (${forecast}) — fast repricing in ${dir} direction vs prior ${previous}; watch whether follow-through confirms a regime shift.`,
    };
  }

  return {
    upsideSurprise:
      "Data beats consensus — risk assets and FX crosses reprice in the direction implied by the release (growth/inflation channel).",
    downsideSurprise:
      "Data misses consensus — defensive flows and vol often lift on the headline; reassess after revision and cross-asset confirmation.",
  };
}

export function buildLiveTape(prices = {}, symbols = []) {
  const syms = [...new Set(symbols.map((s) => String(s).toUpperCase()).filter(Boolean))].slice(0, 8);
  const tape = [];
  for (const sym of syms) {
    const row = prices[sym];
    if (!row?.price && row?.changePercent == null && row?.change_pct == null) continue;
    const ch = row.changePercent ?? row.change_pct;
    tape.push({
      symbol: sym,
      price: row.price != null ? Number(row.price) : null,
      changePercent: ch != null ? Number(ch) : null,
    });
  }
  return tape;
}

export function buildDeterministicEventAnalysis({ event, symbol = "XAUUSD", prices = {} }) {
  const title = event?.event_name || event?.event || event?.title || "Macro release";
  const summary = [event?.description, event?.analyst_note].filter(Boolean).join(" ");
  const themeId = classifyHeadline(title, summary);
  const assetsToWatch = inferHeadlineAssets(title, [], symbol, summary);
  const surprises = buildSurpriseScenarios({
    title,
    forecast: event?.forecast,
    previous: event?.previous,
  });

  const impact = event?.importance || event?.impact;
  const country = event?.country;
  const forecast = event?.forecast;
  const previous = event?.previous;

  const factual = [
    impact && `Impact: ${impact}.`,
    country && `Region: ${country}.`,
    previous != null && `Previous: ${previous}.`,
    forecast != null && `Forecast: ${forecast}.`,
  ]
    .filter(Boolean)
    .join(" ");

  const summaryText = `${title}${country ? ` (${country})` : ""} is a ${String(impact || "scheduled").toLowerCase()}-impact macro release on the desk calendar. ${factual} Active chart: ${symbol}. Theme bucket: ${themeId.replace(/_/g, " ")}.`;

  const deskRead = `For ${symbol}, treat the print as a volatility event: position size down into the release, then trade the surprise vs ${forecast ?? "consensus"} with ${previous != null ? `prior ${previous}` : "history"} as context. Correlated tape below reflects live session moves — not a forecast.`;

  const tradingNotes =
    "First move is often liquidity-driven; wait for cross-asset confirmation (rates, USD, vol) before adding. Scale out into stale liquidity if the move extends without follow-through headlines.";

  const sections = {
    summary: summaryText,
    transmission:
      "Macro releases transmit through front-end yields, the dollar, and risk premia — then into commodities and equities with a lag of minutes to hours depending on surprise size.",
    upsideSurprise: surprises.upsideSurprise,
    downsideSurprise: surprises.downsideSurprise,
    deskRead,
    tradingNotes,
  };

  const analysis = [
    sections.summary,
    sections.transmission,
    `Upside: ${sections.upsideSurprise}`,
    `Downside: ${sections.downsideSurprise}`,
    sections.deskRead,
    sections.tradingNotes,
  ].join("\n\n");

  return {
    analysis,
    sections,
    assetsToWatch,
    themeId,
    liveTape: buildLiveTape(prices, [symbol, ...assetsToWatch.map((a) => a.symbol)]),
    provider: "desk_deterministic",
  };
}

export function mergeAnalysisSections(deterministic, aiSections = {}) {
  const sections = { ...deterministic.sections };
  for (const [id] of SECTION_KEYS) {
    if (aiSections[id]) sections[id] = aiSections[id];
  }
  const analysis = SECTION_KEYS.map(([id]) => sections[id])
    .filter(Boolean)
    .join("\n\n");
  return { ...deterministic, sections, analysis: analysis || deterministic.analysis };
}
