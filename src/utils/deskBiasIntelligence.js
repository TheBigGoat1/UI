/**
 * Desk bias intelligence — headline → symbol read, themed cards, MRKT-style columns.
 */
import { formatNewsTime } from './newsAssets.js';
import { pctFromPriceRow } from './sectorFlowModel.js';
import { resolveTimeframeStack, formatTfLabel } from './timeframeStack.js';
import {
  formatPrice,
  formatChangePercent,
  formatTrend,
  formatStructure,
  formatConfidence,
  formatVix,
  formatLevel,
  LABEL,
} from './displayFormat.js';
import {
  buildBullishBiasCards,
  buildBearishBiasCards,
  prioritizeBiasCards,
} from './deskBiasContent.js';

const THEMES = {
  geopolitical: {
    label: 'Geopolitical risk & shipping',
    test: /\b(war|attack|missile|strike|ceasefire|conflict|military|israel|iran|hezbollah|hamas|gaza|strait|hormuz|shipping|tanker|blockade|explosion|truce)\b/i,
    body:
      'Middle East and shipping headlines move safe havens and energy first — watch whether the story eases tail-risk hedging or re-prices conflict premium.',
  },
  rates_macro: {
    label: 'Rates & inflation narrative',
    test: /\b(fed|fomc|cpi|ppi|pce|inflation|rate cut|rate hike|ecb|boe|boj|nfp|jobs|gdp|yield|treasury|central bank)\b/i,
    body:
      'Macro and central-bank stories reprice real yields and the dollar — gold and FX react through the policy channel, not just sentiment.',
  },
  energy_supply: {
    label: 'Energy & supply chain',
    test: /\b(oil|crude|opec|refinery|natural gas|lng|pipeline|barrel|inventory)\b/i,
    body:
      'Crude supply shocks spill into inflation expectations and risk appetite — energy beta often leads the cross-asset read.',
  },
  risk_tone: {
    label: 'Risk appetite on the tape',
    test: /\b(rally|selloff|risk-on|risk-off|vix|volatility|equities|stocks plunge|stocks surge|safe.?haven)\b/i,
    body:
      'Broad risk-tone headlines set whether flows favor beta, duration, or defensive havens for the session.',
  },
};

const BULLISH_WORDS =
  /\b(surge|soar|rally|jump|gain|beat|strong|easing|ceasefire|deal|cut rates|dovish|approval|record high|upgrade|rebound)\b/i;
const BEARISH_WORDS =
  /\b(plunge|crash|slump|fall|drop|miss|weak|hike rates|hawkish|default|downgrade|ban|attack|war|sanction|strike|blockade)\b/i;
const DE_ESCALATION =
  /\b(ceasefire|truce|talks|diplomatic|ease|passage via|deal|de-escalat|resume shipping|halt.*talks.*resume)\b/i;

const SAFE_HAVEN = new Set(['XAUUSD', 'GLD', 'XAGUSD']);
const RISK_BETA = new Set(['ESUSD', 'NQUSD', 'SPY', 'BTCUSD']);
const ENERGY = new Set(['CLUSD', 'BZUSD', 'XLE']);

function classifyTheme(title = '', summary = '') {
  const text = `${title} ${summary}`.trim();
  for (const [id, theme] of Object.entries(THEMES)) {
    if (theme.test.test(text)) return id;
  }
  return 'risk_tone';
}

function headlineTone(title = '', summary = '') {
  const text = `${title} ${summary}`;
  const bull = BULLISH_WORDS.test(text);
  const bear = BEARISH_WORDS.test(text);
  if (bull && !bear) return 'risk_on';
  if (bear && !bull) return 'risk_off';
  if (bear && bull) return 'mixed';
  return 'neutral';
}

/** Bullish/bearish read of a headline for the active desk symbol */
export function symbolHeadlineBias(symbol, title = '', summary = '') {
  const sym = String(symbol || '').toUpperCase();
  const text = `${title} ${summary}`;
  const tone = headlineTone(title, summary);
  const deEsc = DE_ESCALATION.test(text);
  const escal =
    /\b(attack|missile|strike|war|blockade|explosion|invasion|sanction)\b/i.test(text) && !deEsc;

  if (SAFE_HAVEN.has(sym)) {
    if (escal || (tone === 'risk_off' && !deEsc)) return 'bullish';
    if (deEsc || tone === 'risk_on') return 'bearish';
    if (/\b(rate hike|hawkish|strong dollar|dxy.*up|yields?.*rise)\b/i.test(text)) return 'bearish';
    if (/\b(rate cut|dovish|yields?.*fall|real yields?.*down)\b/i.test(text)) return 'bullish';
    return 'neutral';
  }

  if (ENERGY.has(sym)) {
    if (/\b(supply|blockade|attack|halt|draw|surge|soar|opec.*cut)\b/i.test(text)) return 'bullish';
    if (/\b(build|glut|demand.*weak|inventory build|talks|ceasefire)\b/i.test(text) && !escal) return 'bearish';
    return tone === 'risk_off' ? 'bullish' : tone === 'risk_on' ? 'bearish' : 'neutral';
  }

  if (RISK_BETA.has(sym)) {
    if (tone === 'risk_on' || deEsc) return 'bullish';
    if (tone === 'risk_off' || escal) return 'bearish';
    return 'neutral';
  }

  if (sym === 'DXY' || sym.endsWith('USD') && sym.length === 6) {
    if (/\b(hawkish|rate hike|hot cpi|strong jobs)\b/i.test(text)) return 'bullish';
    if (/\b(dovish|rate cut|weak jobs|disinflation)\b/i.test(text)) return 'bearish';
  }

  if (tone === 'risk_on') return 'bullish';
  if (tone === 'risk_off') return 'bearish';
  return 'neutral';
}

function newsToSnippet(item) {
  const { ago } = formatNewsTime(item.publishedAt || item.time);
  return {
    title: (item.title || '').toUpperCase(),
    ago,
    id: item.id || item.title,
    highlight: Boolean(item.breaking || item.impact === 'high'),
  };
}

function buildNewsThemeCards(symbol, newsPool = [], targetBias, maxCards = 6) {
  const sym = String(symbol || '').toUpperCase();
  const matchDir = targetBias === 'bullish' ? 'bullish' : targetBias === 'bearish' ? 'bearish' : null;
  if (!matchDir) return [];

  const buckets = new Map();
  for (const item of newsPool || []) {
    if (!item?.title) continue;
    const impact = symbolHeadlineBias(sym, item.title, item.description || item.summary);
    if (impact !== matchDir) continue;
    const themeId = classifyTheme(item.title, item.description || item.summary);
    if (!buckets.has(themeId)) buckets.set(themeId, []);
    buckets.get(themeId).push(item);
  }

  const cards = [];
  for (const [themeId, items] of buckets) {
    const theme = THEMES[themeId] || THEMES.risk_tone;
    const sorted = [...items].sort(
      (a, b) => new Date(b.publishedAt || b.time || 0) - new Date(a.publishedAt || a.time || 0),
    );
    const snippets = sorted.slice(0, 4).map(newsToSnippet);
    const lead = sorted[0];
    const extra =
      lead?.description || lead?.summary
        ? ` ${String(lead.description || lead.summary).replace(/\s+/g, ' ').slice(0, 200)}…`
        : '';
    cards.push({
      title: theme.label,
      body: theme.body + extra,
      newsItems: snippets,
      sortKey: sorted.length,
    });
  }

  cards.sort((a, b) => b.sortKey - a.sortKey);
  return cards.slice(0, maxCards);
}

/** Live desk bundle: sector flows, sentiment, calendar — each with numeric evidence. */
export function buildMacroDeskEvidenceCards({ symbol, technical, brief, prices = {}, deskData = {} }) {
  const cards = [];
  const sym = String(symbol || '').toUpperCase();
  const flows = deskData?.capitalFlows?.flows || [];
  const flowSource = deskData?.capitalFlows?.source || 'tape';

  if (flows.length) {
    const ranked = [...flows]
      .filter((f) => f?.pct != null && Number.isFinite(Number(f.pct)))
      .sort((a, b) => Number(b.pct) - Number(a.pct));
    if (ranked.length) {
      const leaders = ranked.slice(0, 3);
      const laggards = ranked.slice(-2);
      const leaderTxt = leaders.map((f) => `${f.name || f.ticker} ${formatChangePercent(Number(f.pct))}`).join(' · ');
      const laggardTxt = laggards.map((f) => `${f.name || f.ticker} ${formatChangePercent(Number(f.pct))}`).join(' · ');
      cards.push({
        title: 'Cross-asset sector rotation',
        body: `Live flow model (${flowSource}): strongest ${leaderTxt}.${laggardTxt ? ` Weakest: ${laggardTxt}.` : ''} Map whether ${sym} is trading with or against this rotation.`,
        evidence: leaders.concat(laggards).slice(0, 5).map((f) => ({
          label: f.ticker || f.name,
          value: formatChangePercent(Number(f.pct)),
        })),
        tone: leaders[0]?.pct >= 0 ? 'bull' : 'bear',
      });
    }
  }

  const sent = deskData?.sentiment;
  if (sent && (sent.score != null || sent.label)) {
    const score = sent.score != null ? Math.round(Number(sent.score)) : null;
    const tone = score != null && score >= 55 ? 'bull' : score != null && score <= 45 ? 'bear' : 'neutral';
    cards.push({
      title: `Desk sentiment: ${sent.label || sent.level || 'composite'}`,
      body:
        sent.description ||
        sent.summary ||
        `Composite sentiment${score != null ? ` ${score}/100` : ''} from index beta, VIX, and session regime.`,
      evidence: [
        score != null ? { label: 'Score', value: `${score}/100` } : null,
        { label: 'VIX', value: formatVix(brief?.regime?.vix) },
        { label: 'Regime', value: brief?.regime?.environment || 'NEUTRAL' },
      ].filter(Boolean),
      tone,
    });
  }

  const sched = deskData?.scheduleRisk;
  if (sched?.description) {
    const next = sched.events?.[0];
    const nextLine = next
      ? ` Next on desk calendar: ${next.title || next.event} (${next.time || next.date || 'scheduled'}).`
      : '';
    cards.push({
      title: `Macro calendar: ${sched.level || 'scheduled'} risk`,
      body: `${sched.description}${nextLine}`,
      evidence: [
        sched.score != null ? { label: 'Risk score', value: String(Math.round(sched.score)) } : null,
        { label: 'HI events', value: String(sched.events?.length || 0) },
      ].filter(Boolean),
      tone: sched.level === 'Elevated' ? 'bear' : 'neutral',
    });
  }

  const fed = deskData?.fedSeries;
  if (fed?.latestRate != null) {
    cards.push({
      title: `US policy rate: ${fed.latestRate}%`,
      body: `Fed funds at ${fed.latestRate}% frames real-yield and USD dynamics — critical for metals, FX, and index beta around CPI/FOMC.`,
      evidence: [
        { label: 'Fed funds', value: `${fed.latestRate}%` },
        { label: 'Source', value: fed.source || 'live' },
      ],
      tone: 'neutral',
    });
  }

  const rates = deskData?.rateRows?.rows;
  if (Array.isArray(rates) && rates.length) {
    const next = rates[0];
    cards.push({
      title: 'Central bank calendar',
      body: `Next rate decision on desk: ${next.bank || next.country || 'CB'} — ${next.event || next.title || 'policy meeting'}. Position size around the print.`,
      evidence: [
        next.date ? { label: 'Date', value: String(next.date).slice(0, 10) } : null,
        next.rate != null ? { label: 'Rate', value: `${next.rate}%` } : null,
      ].filter(Boolean),
      tone: 'neutral',
    });
  }

  if (brief?.veteranLine) {
    cards.push({
      title: 'Desk brief',
      body: brief.veteranLine,
      evidence: [
        { label: 'Session', value: brief?.session?.label || 'Global' },
        { label: 'VIX', value: formatVix(brief?.regime?.vix) },
      ],
      tone: brief?.regime?.environment === 'RISK_ON' ? 'bull' : brief?.regime?.environment === 'RISK_OFF' ? 'bear' : 'neutral',
    });
  }

  return cards;
}

function splitMacroByTone(macroCards = []) {
  const bull = [];
  const bear = [];
  const neutral = [];
  for (const c of macroCards) {
    if (c.tone === 'bull') bull.push(c);
    else if (c.tone === 'bear') bear.push(c);
    else neutral.push(c);
  }
  return { bull, bear, neutral };
}

function mergeBiasCards(structural = [], news = [], limit = 10) {
  const seen = new Set();
  const out = [];
  const push = (c) => {
    const key = c.title;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(c);
  };
  [...news, ...structural].forEach(push);
  return out.slice(0, limit);
}

export function buildTapeMetrics({ symbol, technical, prices, brief, changePercent, chartInterval, chartPeriod }) {
  const sym = String(symbol || '').toUpperCase();
  const ms = technical?.modules?.marketStructure;
  const stack = resolveTimeframeStack(chartInterval || '1h', chartPeriod || '1W');
  const chartLabel = formatTfLabel(chartInterval || '1h');
  const htfLabel = formatTfLabel(stack.htf.interval);
  const ch =
    changePercent != null && Number.isFinite(Number(changePercent))
      ? Number(changePercent)
      : pctFromPriceRow(prices, sym);
  const vix = brief?.regime?.vix;
  const lv = technical?.modules?.levels;

  return [
    {
      label: 'Session',
      value: Number.isFinite(ch) ? formatChangePercent(ch) : LABEL.SYNCING_PCT,
      tone: ch > 0.05 ? 'bull' : ch < -0.05 ? 'bear' : 'neutral',
    },
    {
      label: `HTF ${htfLabel}`,
      value: formatTrend(ms?.htf?.trend),
      tone: ms?.htf?.trend === 'BULLISH' ? 'bull' : ms?.htf?.trend === 'BEARISH' ? 'bear' : 'neutral',
    },
    {
      label: `LTF ${chartLabel}`,
      value: formatTrend(ms?.ltf?.trend),
      tone: ms?.ltf?.trend === 'BULLISH' ? 'bull' : ms?.ltf?.trend === 'BEARISH' ? 'bear' : 'neutral',
    },
    {
      label: 'Structure',
      value: formatStructure(ms?.alignment),
      tone: ms?.alignment === 'ALIGNED' ? 'bull' : 'neutral',
    },
    {
      label: 'Confidence',
      value: formatConfidence(technical?.confidence),
      tone: 'neutral',
    },
    {
      label: 'VIX',
      value: formatVix(vix),
      tone: vix != null && Number(vix) > 22 ? 'bear' : vix != null && Number(vix) < 16 ? 'bull' : 'neutral',
    },
    {
      label: 'Support',
      value: formatLevel(lv?.support, sym),
      tone: 'neutral',
    },
    {
      label: 'Resistance',
      value: formatLevel(lv?.resistance, sym),
      tone: 'neutral',
    },
  ];
}

/**
 * MRKT columns: left = supports current bias, right = what could flip it.
 */
export function buildBiasDeskColumns({
  symbol,
  bias = 'neutral',
  technical,
  brief,
  prices = {},
  deskData = {},
  selectedNews,
  newsPool = [],
  changePercent,
  chartInterval = '1h',
  chartPeriod = '1W',
}) {
  const b = String(bias || 'neutral').toLowerCase();
  const bullish = buildBullishBiasCards({ symbol, technical, selectedNews, brief, prices });
  const bearish = buildBearishBiasCards({ symbol, technical, brief, prices });
  const macroAll = buildMacroDeskEvidenceCards({ symbol, technical, brief, prices, deskData });
  const { bull: macroBull, bear: macroBear, neutral: macroNeutral } = splitMacroByTone(macroAll);

  const supportDir = b === 'neutral' ? (bearish.length >= bullish.length ? 'bearish' : 'bullish') : b;
  const flipDir =
    supportDir === 'bearish' ? 'bullish' : supportDir === 'bullish' ? 'bearish' : 'bullish';

  const newsSupport = buildNewsThemeCards(symbol, newsPool, supportDir, 6);
  const newsFlip = buildNewsThemeCards(symbol, newsPool, flipDir, 6);
  const tfCtx = technical?.timeframeContext;
  const stack = resolveTimeframeStack(chartInterval, chartPeriod);

  let supportCards;
  let flipCards;

  if (supportDir === 'bearish') {
    supportCards = mergeBiasCards(
      [
        ...prioritizeBiasCards(bearish, 8, [/session momentum/i, /htf bearish/i, /risk-off/i, /rejection/i, /rsi/i]),
        ...macroBear,
        ...macroNeutral.slice(0, 2),
      ],
      newsSupport,
      12,
    );
    flipCards = mergeBiasCards(
      [
        ...prioritizeBiasCards(bullish, 8, [/safe/i, /support at/i, /risk-on/i, /aligned/i, /headline/i, /rsi/i]),
        ...macroBull,
        ...macroNeutral.slice(2, 4),
      ],
      newsFlip,
      12,
    );
  } else {
    supportCards = mergeBiasCards(
      [
        ...prioritizeBiasCards(bullish, 8, [/session momentum/i, /htf/i, /support at/i, /risk-on/i, /aligned/i, /rsi/i]),
        ...macroBull,
        ...macroNeutral.slice(0, 2),
      ],
      newsSupport,
      12,
    );
    flipCards = mergeBiasCards(
      [
        ...prioritizeBiasCards(bearish, 8, [/htf bearish/i, /rejection/i, /risk-off/i, /ltf bearish/i, /support test/i]),
        ...macroBear,
        ...macroNeutral.slice(2, 4),
      ],
      newsFlip,
      12,
    );
  }

  const align = String(technical?.modules?.marketStructure?.alignment || '').toUpperCase();
  if (align === 'CONFLICTING') {
    const tfCard = {
      title: `Timeframe conflict (${formatTfLabel(chartInterval)} vs ${formatTfLabel(stack.htf.interval)})`,
      body:
        tfCtx?.confidenceNote ||
        'Chart timeframe and higher timeframe disagree — treat directional bias as provisional until structure aligns.',
    };
    supportCards = mergeBiasCards([tfCard], supportCards);
  } else if (align === 'ALIGNED') {
    const tfCard = {
      title: `Timeframes aligned (${formatTfLabel(chartInterval)} + ${formatTfLabel(stack.htf.interval)})`,
      body: 'Chart and higher timeframe trends agree — directional bias carries higher conviction on this read.',
    };
    supportCards = mergeBiasCards([tfCard], supportCards);
  }

  if (b === 'neutral' && supportCards.length < 2) {
    supportCards = mergeBiasCards([...bullish.slice(0, 2), ...bearish.slice(0, 1)], newsSupport);
    flipCards = mergeBiasCards([...bearish.slice(0, 2), ...bullish.slice(0, 1)], newsFlip);
  }

  const tape = buildTapeMetrics({
    symbol,
    technical,
    prices,
    brief,
    changePercent,
    chartInterval,
    chartPeriod,
  });
  const tfSummary = tfCtx
    ? `${tfCtx.chartLabel}: ${tfCtx.ltfTrend} · HTF ${tfCtx.htfLabel}: ${tfCtx.htfTrend} · ${tfCtx.alignment}`
    : `Chart ${formatTfLabel(chartInterval)} · ${chartPeriod} vs HTF ${formatTfLabel(stack.htf.interval)} · ${chartPeriod}`;

  const summary =
    technical?.summary ||
    (brief?.regime?.guidance
      ? `${tfSummary}. ${brief.regime.guidance.slice(0, 180)}`
      : `${tfSummary} — live desk read on ${symbol}.`);

  return {
    supportDir,
    flipDir,
    supportCards,
    flipCards,
    tape,
    summary,
    headlineCount: (newsPool || []).filter((n) => n?.title).length,
    timeframeSummary: tfSummary,
    timeframeContext: tfCtx,
  };
}
