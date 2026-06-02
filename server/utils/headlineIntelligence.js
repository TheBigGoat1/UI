/**
 * Deterministic headline → market read (no LLM).
 * Shared logic for Insidr Analysis fallbacks and asset pills.
 */

const THEMES = {
  geopolitical: {
    test: /\b(war|attack|missile|strike|invasion|ceasefire|conflict|military|nato|ukraine|russia|israel|iran|hezbollah|hamas|gaza|strait|hormuz|shipping|tanker|sanctions on oil)\b/i,
    assets: [
      { symbol: "CLUSD", bias: "up", rationale: "Supply / shipping risk premium" },
      { symbol: "BZUSD", bias: "up", rationale: "Crude complex beta" },
      { symbol: "XAUUSD", bias: "up", rationale: "Safe-haven bid" },
      { symbol: "VIX", bias: "up", rationale: "Risk premium" },
      { symbol: "ESUSD", bias: "down", rationale: "Risk-off equities" },
      { symbol: "DXY", bias: "neutral", rationale: "Mixed USD haven vs growth" },
      { symbol: "BTCUSD", bias: "neutral", rationale: "Volatile risk proxy" },
    ],
    transmission:
      "Geopolitical headlines typically lift energy and volatility while pressuring broad risk assets; safe havens absorb defensive flows.",
    durability: "Unless the story resolves supply routes or escalates materially, the price reaction often fades within sessions.",
  },
  rates_macro: {
    test: /\b(fed|fomc|cpi|ppi|pce|inflation|deflation|rate cut|rate hike|ecb|boe|boj|nfp|jobs report|unemployment|gdp|recession|yield|treasury|10-year|10y|central bank)\b/i,
    assets: [
      { symbol: "DXY", bias: "neutral", rationale: "USD on policy repricing" },
      { symbol: "EURUSD", bias: "neutral", rationale: "Cross-currency policy gap" },
      { symbol: "XAUUSD", bias: "neutral", rationale: "Real-yield / USD sensitivity" },
      { symbol: "ESUSD", bias: "neutral", rationale: "Growth & discount-rate beta" },
      { symbol: "US10Y", bias: "neutral", rationale: "Rates anchor" },
      { symbol: "VIX", bias: "neutral", rationale: "Policy surprise vol" },
    ],
    transmission:
      "Macro prints and central-bank signals reprice the dollar, front-end yields, and duration-sensitive equities.",
    durability: "Data surprises can extend trends; scheduled events often mean-revert after the initial spike.",
  },
  equity_corporate: {
    test: /\b(ipo|earnings|revenue|profit|guidance|merger|acquisition|buyback|layoff|sec filing|nvidia|apple|microsoft|meta|amazon|tesla|quant|hedge fund|stock split)\b/i,
    assets: [
      { symbol: "NQUSD", bias: "up", rationale: "Growth / tech beta" },
      { symbol: "ESUSD", bias: "up", rationale: "Broad US equity sentiment" },
      { symbol: "VIX", bias: "down", rationale: "Single-name vs macro vol" },
      { symbol: "BTCUSD", bias: "neutral", rationale: "Risk appetite spillover" },
      { symbol: "DXY", bias: "neutral", rationale: "Secondary to risk tone" },
    ],
    transmission:
      "Corporate and tech headlines flow through Nasdaq beta first, then the broader index complex.",
    durability: "Unless the story shifts sector regulation or macro growth, impact is often concentrated in related names.",
  },
  energy_supply: {
    test: /\b(oil|crude|opec|refinery|gasoline|natural gas|lng|pipeline|inventory draw|inventory build|barrel)\b/i,
    assets: [
      { symbol: "CLUSD", bias: "up", rationale: "WTI spot complex" },
      { symbol: "BZUSD", bias: "up", rationale: "Brent linkage" },
      { symbol: "XLE", bias: "up", rationale: "Energy equities" },
      { symbol: "DXY", bias: "down", rationale: "Commodity-currency channel" },
      { symbol: "XAUUSD", bias: "neutral", rationale: "Inflation hedge overlap" },
      { symbol: "ESUSD", bias: "down", rationale: "Cost-push headwind risk" },
    ],
    transmission:
      "Energy supply stories move the crude curve and energy equities, with secondary effects on inflation expectations and consumer staples.",
    durability: "Inventory and OPEC headlines can sustain trends; one-off headlines often retrace.",
  },
  fx_sovereign: {
    test: /\b(yen|jpy|euro|sterling|pound|franc|yuan|renminbi|dollar index|dxy|currency|forex|fx swap|intervention)\b/i,
    assets: [
      { symbol: "EURUSD", bias: "neutral", rationale: "Major USD cross" },
      { symbol: "GBPUSD", bias: "neutral", rationale: "G10 cross" },
      { symbol: "DXY", bias: "neutral", rationale: "Basket move" },
      { symbol: "XAUUSD", bias: "neutral", rationale: "Inverse USD correlation" },
      { symbol: "ESUSD", bias: "neutral", rationale: "Risk tone via FX" },
    ],
    transmission:
      "FX headlines transmit through cross rates, carry positioning, and export-sensitive equities.",
    durability: "Intervention or policy shifts can persist; verbal guidance alone often fades.",
  },
  crypto: {
    test: /\b(bitcoin|btc|ethereum|eth|crypto|stablecoin|etf.*bitcoin|sec.*crypto)\b/i,
    assets: [
      { symbol: "BTCUSD", bias: "neutral", rationale: "Spot crypto" },
      { symbol: "NQUSD", bias: "neutral", rationale: "Risk-on correlation" },
      { symbol: "XAUUSD", bias: "neutral", rationale: "Alternative store-of-value" },
      { symbol: "DXY", bias: "neutral", rationale: "Liquidity / USD funding" },
      { symbol: "VIX", bias: "neutral", rationale: "Risk appetite gauge" },
    ],
    transmission:
      "Crypto headlines hit digital assets first, with spillover to growth equities when flows are large.",
    durability: "Regulatory and ETF flows can be structural; social headlines are usually short-lived.",
  },
  trade_policy: {
    test: /\b(tariff|trade war|import ban|export ban|customs|wto|chip ban|semiconductor restriction)\b/i,
    assets: [
      { symbol: "ESUSD", bias: "down", rationale: "Trade friction growth drag" },
      { symbol: "NQUSD", bias: "down", rationale: "Tech supply-chain risk" },
      { symbol: "DXY", bias: "up", rationale: "Uncertainty bid to USD" },
      { symbol: "CNH", bias: "down", rationale: "EM / China beta" },
      { symbol: "CLUSD", bias: "neutral", rationale: "Demand uncertainty" },
    ],
    transmission:
      "Trade and tariff headlines raise input-cost uncertainty and can widen risk premia in exporters and tech hardware.",
    durability: "Escalation cycles can trend; headline-level threats without implementation often partially reverse.",
  },
};

const BULLISH_WORDS =
  /\b(surge|soar|rally|jump|gain|beat|strong|easing|ceasefire|deal|cut rates|dovish|approval|record high|upgrade)\b/i;
const BEARISH_WORDS =
  /\b(plunge|crash|slump|fall|drop|miss|weak|hike rates|hawkish|default|downgrade|ban|attack|war|sanction|strike)\b/i;

export function classifyHeadline(title = "", summary = "") {
  const text = `${title} ${summary}`.trim();
  for (const [id, theme] of Object.entries(THEMES)) {
    if (theme.test.test(text)) return id;
  }
  return "general";
}

function headlineTone(title = "", summary = "") {
  const text = `${title} ${summary}`;
  const bull = BULLISH_WORDS.test(text);
  const bear = BEARISH_WORDS.test(text);
  if (bull && !bear) return "risk_on";
  if (bear && !bull) return "risk_off";
  if (bear && bull) return "mixed";
  return "neutral";
}

function applyToneToAssets(assets, tone) {
  if (tone === "neutral" || tone === "mixed") return assets;
  return assets.map((a) => {
    if (a.bias !== "neutral") return a;
    if (tone === "risk_on" && ["ESUSD", "NQUSD", "BTCUSD"].includes(a.symbol)) {
      return { ...a, bias: "up" };
    }
    if (tone === "risk_off" && ["ESUSD", "NQUSD", "VIX", "XAUUSD", "CLUSD"].includes(a.symbol)) {
      const upSymbols = new Set(["VIX", "XAUUSD", "CLUSD", "BZUSD"]);
      return { ...a, bias: upSymbols.has(a.symbol) ? "up" : "down" };
    }
    return a;
  });
}

/** Extract notable tokens from headline for grounding checks */
export function extractHeadlineAnchors(title = "", summary = "") {
  const text = `${title} ${summary}`;
  const proper = [...text.matchAll(/\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)*)\b/g)].map((m) => m[1]);
  const tickers = [...text.matchAll(/\b([A-Z]{2,5}(?:USD|USDT)?)\b/g)].map((m) => m[1]);
  const acronyms = [...text.matchAll(/\b(Fed|ECB|BoE|BoJ|OPEC|SEC|NATO|GDP|CPI|FOMC|ETF|IPO|AI)\b/g)].map(
    (m) => m[1],
  );
  return [...new Set([...proper, ...tickers, ...acronyms])].slice(0, 12);
}

export function inferHeadlineAssets(title = "", symbols = [], deskAsset = "XAUUSD", summary = "") {
  const fromSymbols = (symbols || []).map((s) => String(s).toUpperCase()).filter(Boolean);
  const themeId = classifyHeadline(title, summary);
  const theme = THEMES[themeId];
  const tone = headlineTone(title, summary);

  let base =
    theme?.assets ||
    [
      { symbol: deskAsset, bias: "neutral", rationale: "Desk symbol" },
      { symbol: "ESUSD", bias: "neutral", rationale: "US risk gauge" },
      { symbol: "VIX", bias: "neutral", rationale: "Vol regime" },
      { symbol: "EURUSD", bias: "neutral", rationale: "USD cross" },
      { symbol: "XAUUSD", bias: "neutral", rationale: "Macro hedge" },
    ];

  base = applyToneToAssets(base, tone);

  const merged = [];
  const seen = new Set();
  const push = (row) => {
    const sym = String(row.symbol || "").toUpperCase();
    if (!sym || seen.has(sym)) return;
    seen.add(sym);
    merged.push({
      symbol: sym,
      label: row.label || sym,
      bias: ["up", "down", "neutral"].includes(row.bias) ? row.bias : "neutral",
      rationale: row.rationale || "Headline-linked",
    });
  };

  for (const sym of fromSymbols) {
    push({ symbol: sym, bias: "neutral", rationale: "Tagged in story" });
  }
  for (const row of base) push(row);
  if (!seen.has(deskAsset)) {
    push({ symbol: deskAsset, bias: "neutral", rationale: "Active desk chart" });
  }

  return merged.slice(0, 8);
}

function formatQuoteLine(snapshot, sym) {
  const q = snapshot?.quotes?.[sym];
  if (!q?.price) return null;
  const ch = q.change_pct != null ? Number(q.change_pct) : null;
  const chStr =
    ch != null ? ` (${ch >= 0 ? "+" : ""}${ch.toFixed(2)}% session)` : "";
  return `${sym} ${Number(q.price).toLocaleString(undefined, { maximumFractionDigits: 4 })}${chStr}`;
}

export function buildDeterministicNewsAnalysis({
  title = "",
  summary = "",
  asset = "XAUUSD",
  symbols = [],
  snapshot = {},
  technical = {},
  sentimentScore = null,
}) {
  const themeId = classifyHeadline(title, summary);
  const theme = THEMES[themeId] || null;
  const tone = headlineTone(title, summary);
  const anchors = extractHeadlineAnchors(title, summary);
  const subject =
    anchors.length > 0
      ? anchors.slice(0, 3).join(", ")
      : title.split(/\s+/).slice(0, 6).join(" ");

  const lead = title
    ? `The headline (${title.trim()}) centers on ${subject}.`
    : "No headline text was supplied.";

  const detail = summary
    ? ` ${summary.trim().replace(/\s+/g, " ").slice(0, 320)}${summary.length > 320 ? "…" : ""}`
    : "";

  const transmission = theme?.transmission || "Cross-asset markets will reprice based on whether the story shifts growth, inflation, or risk appetite.";
  const durability = theme?.durability || "Treat the first move as event-driven until follow-through headlines confirm a trend.";

  const toneClause =
    tone === "risk_on"
      ? "Language skews constructive for risk assets."
      : tone === "risk_off"
        ? "Language skews defensive — favor havens and vol over beta."
        : tone === "mixed"
          ? "Mixed signals in the copy — avoid oversized directional bets on the first tick."
          : "Tone is balanced; lean on transmission rather than sentiment adjectives.";

  const deskQ = formatQuoteLine(snapshot, asset);
  const vix =
    snapshot?.vix != null ? `VIX ${Number(snapshot.vix).toFixed(1)}` : null;
  const liveBit = [deskQ, vix].filter(Boolean).join("; ");

  const chartBits = [];
  if (technical?.bias) chartBits.push(`desk chart bias ${technical.bias}`);
  if (technical?.htfTrend) chartBits.push(`HTF ${technical.htfTrend}`);
  if (technical?.ltfTrend) chartBits.push(`LTF ${technical.ltfTrend}`);
  if (technical?.alignment) chartBits.push(`structure ${technical.alignment}`);
  const chartClause = chartBits.length
    ? ` On ${asset}, ${chartBits.join(", ")} — use that as execution context, not as a substitute for the headline read.`
    : "";

  const sentimentClause =
    sentimentScore != null && Math.abs(sentimentScore) > 0.1
      ? ` Feed sentiment score ${Number(sentimentScore).toFixed(2)} aligns with a ${sentimentScore > 0 ? "positive" : "negative"} tilt in the source text.`
      : "";

  const analysis = [
    lead + detail,
    transmission,
    toneClause,
    durability,
    liveBit && `Live tape: ${liveBit}.`,
    chartClause,
    sentimentClause,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    analysis,
    assets: inferHeadlineAssets(title, symbols, asset, summary),
    theme: themeId,
    tone,
    anchors,
  };
}

/** Reject LLM output that ignores the headline (generic boilerplate) */
export function analysisGroundingScore(title = "", analysis = "") {
  if (!title || !analysis) return 0;
  const titleTokens = title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);
  const body = analysis.toLowerCase();
  if (!titleTokens.length) return 1;
  const hits = titleTokens.filter((w) => body.includes(w)).length;
  return hits / titleTokens.length;
}

export const GENERIC_ANALYSIS_PATTERNS = [
  /japanese shipping/i,
  /strait risk specifically/i,
  /marginal easing of strait/i,
  /configure anthropic/i,
  /institutional desk note template/i,
];

export function isGenericAnalysis(analysis = "") {
  const a = String(analysis || "");
  return GENERIC_ANALYSIS_PATTERNS.some((re) => re.test(a));
}
