/**
 * Candle Analysis — MRKT-style modal content (Claude + live calendar/news context).
 */

import { query } from "../db.js";
import { chatCompletion, hasAnthropicKey } from "./anthropic.js";
import { buildNewsMarketSnapshot } from "./newsAnalysis.js";
import { getHistory } from "./marketData.js";
import { macroScopeForSymbol } from "../utils/symbolMacro.js";
import { COUNTRY_META } from "./economicCalendar.js";

function parseCandleAnalysisJson(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim().replace(/^```json?\s*/i, "").replace(/```\s*$/i, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function getEventsNearTime(symbol, anchorTime, hours = 48) {
  const anchor = anchorTime ? new Date(anchorTime) : new Date();
  const from = new Date(anchor.getTime() - hours * 60 * 60 * 1000);
  const to = new Date(anchor.getTime() + hours * 0.5 * 60 * 60 * 1000);
  const scope = macroScopeForSymbol(symbol);

  try {
    const { rows } = await query(
      `SELECT id, country, event AS event_name, impact AS importance, actual, forecast, previous, event_time
       FROM economic_events
       WHERE event_time >= $1 AND event_time <= $2
       ORDER BY ABS(EXTRACT(EPOCH FROM (event_time - $3::timestamptz))) ASC
       LIMIT 12`,
      [from.toISOString(), to.toISOString(), anchor.toISOString()],
    );
    return (rows || [])
      .filter((r) => scope.countries.includes(String(r.country || "").toUpperCase()))
      .map((r) => ({
        id: r.id,
        country: r.country,
        event_name: r.event_name,
        importance: r.importance,
        actual: r.actual,
        forecast: r.forecast,
        previous: r.previous,
        event_time: r.event_time,
        currency: COUNTRY_META[r.country]?.currency || r.country,
      }));
  } catch {
    return [];
  }
}

function formatNewsRow(item) {
  const t = item.publishedAt || item.time || item.published_at;
  return {
    title: item.title || "",
    summary: item.description || item.summary || "",
    publishedAt: t,
    source: item.source || item.publisher || null,
    url: item.url || item.link || null,
  };
}

function rankRelatedNews(anchor, pool, limit = 6) {
  const title = (anchor.title || "").toLowerCase();
  const words = title.split(/\s+/).filter((w) => w.length > 3);
  const scored = (pool || [])
    .filter((n) => n.title && n.title !== anchor.title)
    .map((n) => {
      const t = (n.title || "").toLowerCase();
      let score = 0;
      for (const w of words) {
        if (t.includes(w)) score += 1;
      }
      return { item: n, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => formatNewsRow(x.item));
}

export async function analyzeCandleMoment({
  symbol = "XAUUSD",
  headline = {},
  marketContext = null,
  relatedNewsPool = [],
  clickedBar = null,
}) {
  const title = headline.title || headline.text || "";
  const summary = headline.summary || headline.description || "";
  const publishedAt = headline.publishedAt || headline.time || headline.published_at || null;

  const [snapshot, events, historyRes] = await Promise.all([
    buildNewsMarketSnapshot(symbol),
    getEventsNearTime(symbol, publishedAt, 72),
    getHistory(symbol, "1m", "1D").catch(() => null),
  ]);

  const isSynthetic =
    Boolean(historyRes?.synthetic) ||
    marketContext?.data_quality === "model" ||
    marketContext?.is_live_tape === false;
  const hasWireHeadline =
    Boolean(title) &&
    !["chart_tap", "chart_session", "candle_session"].includes(String(headline.source || ""));

  const relatedNews = rankRelatedNews(
    { title, ...headline },
    [headline, ...relatedNewsPool].filter(Boolean),
    8,
  );

  const anchorMs = publishedAt ? new Date(publishedAt).getTime() : Date.now();
  const leadingHeadlines = (relatedNewsPool || [])
    .filter((n) => n.title && n.title !== title)
    .map((n) => ({
      item: n,
      t: new Date(n.publishedAt || n.time || 0).getTime(),
    }))
    .filter((x) => Number.isFinite(x.t) && x.t < anchorMs)
    .sort((a, b) => b.t - a.t)
    .slice(0, 5);

  const whatLedBullets = leadingHeadlines.map((x) => {
    const row = formatNewsRow(x.item);
    const when = row.publishedAt
      ? new Date(row.publishedAt).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : 'prior session';
    return `${when} — ${row.title}`;
  });

  const whatLedToThis = {
    summary: leadingHeadlines.length
      ? `Prior wire flow (${leadingHeadlines.length} headline${leadingHeadlines.length === 1 ? '' : 's'}) in the hours before this candle.`
      : 'No earlier headlines in the current feed before this timestamp.',
    bullets: whatLedBullets,
  };

  const bars = historyRes?.bars || [];
  const chartBars = bars.slice(-120);

  const barContext = clickedBar
    ? {
        time: clickedBar.time,
        open: clickedBar.open,
        high: clickedBar.high,
        low: clickedBar.low,
        close: clickedBar.close,
        interval: clickedBar.interval || marketContext?.interval || "1h",
      }
    : null;

  const factualBullets = events.slice(0, 4).map((ev) => {
    const parts = [ev.event_name];
    if (ev.actual != null) parts.push(`Actual: ${ev.actual}`);
    if (ev.forecast != null) parts.push(`Forecast: ${ev.forecast}`);
    return parts.join(" — ");
  });

  if (!hasAnthropicKey() || !title || (isSynthetic && !hasWireHeadline)) {
    return {
      symbol,
      publishedAt,
      whatHappened: {
        summary: summary || title,
        bullets: factualBullets.length
          ? factualBullets
          : ["No calendar events matched this window — sync macro data for richer context."],
      },
      whatLedToThis,
      technicals:
        marketContext?.technical_summary ||
        `Session structure on ${symbol}: bias ${marketContext?.bias || "neutral"}.`,
      relatedNews,
      relatedEvents: events,
      chart: { interval: "1m", bars: chartBars, synthetic: Boolean(historyRes?.synthetic) },
      provider: isSynthetic ? "factual_model" : "factual",
      aiEnabled: hasAnthropicKey(),
      data_quality: isSynthetic ? "model" : "live",
      market_snapshot: snapshot,
      bar_context: barContext,
    };
  }

  const system = `You are Insidr Desk AI writing MRKT-style "Candle Analysis" for a chart marker click.
Return ONLY valid JSON:
{
  "whatHappened": {
    "summary": "One sentence headline takeaway",
    "bullets": ["3-5 short bullets on drivers — concrete, no disclaimers"]
  },
  "whatLedToThis": {
    "summary": "One sentence on prior catalysts that set up this move",
    "bullets": ["2-4 bullets from RELATED HEADLINES and calendar before the anchor time — factual only"]
  },
  "technicals": "One paragraph on how price reacted and what structure/levels matter on the desk symbol"
}
Ground in the headline, summary, live quotes, calendar events, and technical context. Never invent headlines or prices.
If DATA_QUALITY is "model", qualify statements and never present model bars as confirmed live prints.`;

  const user = `Symbol: ${symbol}
DATA_QUALITY: ${isSynthetic ? "model" : "live"}
Headline time: ${publishedAt || "recent session"}
HEADLINE: ${title}
SUMMARY: ${summary || "n/a"}

CLICKED BAR (OHLC):
${JSON.stringify(barContext || "not provided", null, 2)}

TECHNICAL CONTEXT:
${JSON.stringify(marketContext || {}, null, 2)}

LIVE MARKET SNAPSHOT:
${JSON.stringify(snapshot, null, 2)}

NEARBY CALENDAR EVENTS:
${JSON.stringify(events, null, 2)}

RELATED HEADLINES IN FEED:
${JSON.stringify(relatedNews.map((n) => n.title), null, 2)}`;

  try {
    const raw = await chatCompletion({ system, user, maxTokens: 900 });
    const parsed = parseCandleAnalysisJson(raw);
    if (parsed?.whatHappened) {
      return {
        symbol,
        publishedAt,
        whatHappened: {
          summary: parsed.whatHappened.summary || summary || title,
          bullets: Array.isArray(parsed.whatHappened.bullets)
            ? parsed.whatHappened.bullets
            : factualBullets,
        },
        whatLedToThis: parsed.whatLedToThis || whatLedToThis,
        technicals: parsed.technicals || parsed.technical || "",
        relatedNews,
        relatedEvents: events,
        chart: { interval: "1m", bars: chartBars, synthetic: Boolean(historyRes?.synthetic) },
        provider: "anthropic",
        data_quality: isSynthetic ? "model" : "live",
        market_snapshot: snapshot,
        bar_context: barContext,
      };
    }
    const prose = String(raw).trim();
    return {
      symbol,
      publishedAt,
      whatHappened: { summary: prose.slice(0, 200), bullets: factualBullets },
      whatLedToThis,
      technicals: prose,
      relatedNews,
      relatedEvents: events,
      chart: { interval: "1m", bars: chartBars, synthetic: Boolean(historyRes?.synthetic) },
      provider: "anthropic",
      aiEnabled: true,
      data_quality: isSynthetic ? "model" : "live",
      market_snapshot: snapshot,
      bar_context: barContext,
    };
  } catch (err) {
    return {
      symbol,
      publishedAt,
      whatHappened: { summary: summary || title, bullets: factualBullets },
      whatLedToThis,
      technicals: `Analysis error: ${err.message}`,
      relatedNews,
      relatedEvents: events,
      chart: { interval: "1m", bars: chartBars, synthetic: Boolean(historyRes?.synthetic) },
      provider: "error",
      data_quality: isSynthetic ? "model" : "live",
      market_snapshot: snapshot,
      bar_context: barContext,
    };
  }
}
