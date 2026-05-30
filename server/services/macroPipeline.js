import { query } from "../db.js";
import { COUNTRY_META } from "./economicCalendar.js";
import { chatCompletion, hasAnthropicKey } from "./anthropic.js";
import { ensureMacroDataReady } from "./macroBootstrap.js";

export const CORE_COUNTRIES = ["US", "EU", "GB", "JP", "AU", "CA", "CH", "NZ", "CN"];

export async function ensureMacroTables() {
  await query(
    `CREATE TABLE IF NOT EXISTS macro_country_cache (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      country TEXT NOT NULL,
      as_of_date DATE NOT NULL,
      summary JSONB NOT NULL DEFAULT '{}'::jsonb,
      interpretation TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(country, as_of_date)
    )`,
  );
}

function fallbackInterpretation(summary) {
  const { counts, direction, label, currency } = summary;
  return `${label} (${currency || "—"}) macro pulse is ${direction.replace(/-/g, " ")}. ` +
    `${counts.HIGH} high-impact, ${counts.MEDIUM} medium, and ${counts.LOW} low-impact events ` +
    `in the 14d past / 45d forward window. Risk score ${summary.riskScore}. ` +
    `Watch ${currency || label} crosses around scheduled releases.`;
}

export async function computeCountrySummary(country) {
  await ensureMacroTables();
  const code = String(country || "").toUpperCase();

  const { rows: impactRows } = await query(
    `SELECT impact, COUNT(*)::int AS count
     FROM economic_events
     WHERE country = $1
       AND event_time >= NOW() - INTERVAL '14 days'
       AND event_time <= NOW() + INTERVAL '45 days'
     GROUP BY impact`,
    [code],
  );

  const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const r of impactRows) {
    const key = String(r.impact || "MEDIUM").toUpperCase();
    if (counts[key] != null) counts[key] = r.count;
    else counts.MEDIUM += r.count;
  }

  const { rows: nextRows } = await query(
    `SELECT event, impact, event_time, forecast, previous
     FROM economic_events
     WHERE country = $1 AND event_time >= NOW()
     ORDER BY
       CASE impact WHEN 'HIGH' THEN 0 WHEN 'MEDIUM' THEN 1 ELSE 2 END,
       event_time ASC
     LIMIT 1`,
    [code],
  );

  const { rows: totalRows } = await query(
    `SELECT COUNT(*)::int AS n FROM economic_events
     WHERE country = $1
       AND event_time >= NOW() - INTERVAL '14 days'
       AND event_time <= NOW() + INTERVAL '45 days'`,
    [code],
  );

  const riskScore = counts.HIGH * 3 + counts.MEDIUM * 2 + counts.LOW;
  const direction =
    riskScore >= 24 ? "high-volatility" : riskScore >= 12 ? "elevated" : "stable";

  return {
    country: code,
    label: COUNTRY_META[code]?.label || code,
    currency: COUNTRY_META[code]?.currency || null,
    counts,
    riskScore,
    direction,
    eventCount: totalRows[0]?.n ?? 0,
    nextEvent: nextRows[0]
      ? {
          event: nextRows[0].event,
          impact: nextRows[0].impact,
          event_time: nextRows[0].event_time,
          forecast: nextRows[0].forecast,
          previous: nextRows[0].previous,
        }
      : null,
  };
}

export async function interpretCountrySummary(summary) {
  await ensureMacroTables();
  const today = new Date().toISOString().slice(0, 10);

  const { rows: cached } = await query(
    `SELECT interpretation FROM macro_country_cache
     WHERE country = $1 AND as_of_date = $2::date AND interpretation IS NOT NULL`,
    [summary.country, today],
  );
  if (cached[0]?.interpretation) {
    return cached[0].interpretation;
  }

  let interpretation = fallbackInterpretation(summary);

  if (hasAnthropicKey()) {
    try {
      const text = await chatCompletion({
        user: `Write 3-4 sentences of institutional macro intelligence for traders on ${summary.label} (${summary.currency}).
Data: direction=${summary.direction}, riskScore=${summary.riskScore}, high=${summary.counts.HIGH}, medium=${summary.counts.MEDIUM}, low=${summary.counts.LOW}, upcomingEvents=${summary.eventCount}.
${summary.nextEvent ? `Next release: ${summary.nextEvent.event} at ${summary.nextEvent.event_time}.` : ""}
Be specific about FX/volatility implications. No bullet lists.`,
        maxTokens: 280,
      });
      if (text?.trim()) interpretation = text.trim();
    } catch (err) {
      console.warn("[macro] AI interpretation fallback:", summary.country, err.message);
    }
  }

  await query(
    `INSERT INTO macro_country_cache (country, as_of_date, summary, interpretation, updated_at)
     VALUES ($1, $2::date, $3::jsonb, $4, NOW())
     ON CONFLICT (country, as_of_date) DO UPDATE SET
       summary = EXCLUDED.summary,
       interpretation = EXCLUDED.interpretation,
       updated_at = NOW()`,
    [summary.country, today, JSON.stringify(summary), interpretation],
  );

  return interpretation;
}

export async function getCountryIntelligence(country) {
  await ensureMacroDataReady();
  const code = String(country || "").toUpperCase();
  if (!CORE_COUNTRIES.includes(code)) {
    throw new Error("Unsupported country.");
  }

  const summary = await computeCountrySummary(code);
  const interpretation = await interpretCountrySummary(summary);

  const { rows: events } = await query(
    `SELECT country, event, impact, actual, forecast, previous, event_time
     FROM economic_events
     WHERE country = $1
       AND event_time >= NOW() - INTERVAL '14 days'
       AND event_time <= NOW() + INTERVAL '45 days'
     ORDER BY event_time ASC
     LIMIT 120`,
    [code],
  );

  return {
    ...summary,
    interpretation,
    events,
    meta: {
      asOf: new Date().toISOString(),
      eventWindow: "14d past · 45d forward",
      aiPowered: hasAnthropicKey(),
    },
  };
}

export async function listCountriesIntelligence() {
  await ensureMacroDataReady();
  const out = [];
  for (const c of CORE_COUNTRIES) {
    out.push(await computeCountrySummary(c));
  }
  return out;
}
