/** Client helpers for Rates & Central Bank desk tab */

export const RATE_DECISION_PATTERN =
  /fomc|fed funds|fed rate|interest rate decision|official bank rate|main refinancing|deposit facility|policy rate|cash rate|ocr|monetary policy|boj|boe|ecb|boc|rba|rbnz|pboc|rate decision|rate statement/i;

export function isRateDecisionEvent(name) {
  const t = String(name || '');
  if (!t) return false;
  if (/pmi|gdp|cpi|nfp|jobless|retail|confidence|sentiment|trade balance|housing/i.test(t)) return false;
  if (/press conference|minutes|speech|testimony/i.test(t) && !/rate|fomc|bank rate|policy rate|refinancing|ocr|decision/i.test(t)) {
    return false;
  }
  return RATE_DECISION_PATTERN.test(t);
}

export function parseRateValue(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  const n = parseFloat(s.replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(n)) return null;
  if (s.includes('%') || n > 0.5) return Number(n.toFixed(3));
  return Number((n * 100).toFixed(3));
}

export function mapCalendarToRateRows(events = [], country = null) {
  const now = Date.now();
  const horizon = now + 120 * 24 * 60 * 60 * 1000;
  return (events || [])
    .filter((ev) => {
      const t = new Date(ev.event_time).getTime();
      if (t < now - 60_000 || t > horizon) return false;
      const c = String(ev.country || '').toUpperCase();
      if (country && c !== String(country).toUpperCase()) return false;
      return isRateDecisionEvent(ev.event_name || ev.event);
    })
    .sort((a, b) => new Date(a.event_time) - new Date(b.event_time))
    .slice(0, 16)
    .map((ev) => {
      const prev = parseRateValue(ev.previous);
      const fcst = parseRateValue(ev.forecast);
      const act = parseRateValue(ev.actual);
      let trend = [];
      if (prev != null && fcst != null) trend = [prev, (prev + fcst) / 2, fcst];
      else if (prev != null && act != null) trend = [prev, (prev + act) / 2, act];
      else if (prev != null) trend = [prev, prev, prev];
      else if (fcst != null) trend = [fcst, fcst, fcst];
      const outcomeRaw = ev.forecast ? String(ev.forecast) : ev.actual ? String(ev.actual) : '—';
      return {
        id: ev.id,
        decision: ev.event_name || ev.event,
        country: ev.country,
        date: new Date(ev.event_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        event_time: ev.event_time,
        outcome: outcomeRaw,
        previous: ev.previous ?? '—',
        impact: ev.importance || ev.impact,
        trend,
      };
    });
}

export function filterCbEvents(events = [], bank) {
  const keywords = [bank.code, bank.label, 'rate', 'fomc', 'interest', 'monetary', 'policy'];
  return (events || [])
    .filter((ev) => {
      const t = new Date(ev.event_time).getTime();
      if (t < Date.now() - 60_000) return false;
      const c = String(ev.country || '').toUpperCase();
      if (c === bank.id) return true;
      const name = `${ev.event_name || ev.event || ''}`.toLowerCase();
      return keywords.some((k) => name.includes(k.toLowerCase()));
    })
    .sort((a, b) => new Date(a.event_time) - new Date(b.event_time))
    .slice(0, 12);
}

export function stanceFromEconomy(economyDetail, rateSeries) {
  if (economyDetail?.direction === 'high-volatility') {
    return { label: 'High macro volatility', tone: 'bear' };
  }
  if (economyDetail?.direction === 'elevated') {
    return { label: 'Neutral to Hawkish', tone: 'hawk' };
  }
  const pts = rateSeries?.series || [];
  if (pts.length >= 3) {
    const recent = pts.slice(-4).map((p) => p.value);
    const delta = recent[recent.length - 1] - recent[0];
    if (delta >= 0.15) return { label: 'Hawkish tilt', tone: 'hawk' };
    if (delta <= -0.15) return { label: 'Dovish tilt', tone: 'dove' };
    if (Math.abs(delta) >= 0.05) {
      return {
        label: delta > 0 ? 'Neutral to Hawkish' : 'Neutral to Dovish',
        tone: delta > 0 ? 'hawk' : 'dove',
      };
    }
  }
  return { label: 'Stable / on hold', tone: 'neutral' };
}

export function formatRateSource(source) {
  if (!source) return '';
  if (source.startsWith('yahoo:')) return 'Live yield';
  if (source === 'economic_calendar') return 'Calendar policy';
  return 'Desk';
}

export function buildRateSeriesFromCalendar(events = [], country = 'US') {
  const code = String(country || 'US').toUpperCase();
  const now = Date.now();
  const past = now - 5 * 365 * 24 * 60 * 60 * 1000;
  const future = now + 120 * 24 * 60 * 60 * 1000;

  const points = (events || [])
    .filter((ev) => String(ev.country || '').toUpperCase() === code)
    .filter((ev) => isRateDecisionEvent(ev.event_name || ev.event))
    .map((ev) => {
      const t = new Date(ev.event_time).getTime();
      if (t < past || t > future) return null;
      const value =
        parseRateValue(ev.actual) ?? parseRateValue(ev.forecast) ?? parseRateValue(ev.previous);
      if (value == null) return null;
      return {
        label: new Date(ev.event_time).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
        value,
        event_time: ev.event_time,
        event: ev.event_name || ev.event,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.event_time) - new Date(b.event_time));

  if (!points.length) return null;

  const series =
    points.length === 1
      ? [
          { label: points[0].label, value: points[0].value },
          { label: 'Current', value: points[0].value },
        ]
      : points.slice(-20).map(({ label, value }) => ({ label, value }));

  const latest = series[series.length - 1].value;
  return {
    asOf: new Date().toISOString(),
    series,
    latestRate: latest,
    source: 'economic_calendar',
    label: `${code} policy rate (calendar releases)`,
    country: code,
  };
}

export function resolveRateSeries({ apiSeries, calendarEvents, country, deskFedSeries }) {
  if (apiSeries?.series?.length >= 2) return apiSeries;
  const fromCal = buildRateSeriesFromCalendar(calendarEvents, country);
  if (fromCal?.series?.length >= 2) return fromCal;
  if (String(country).toUpperCase() === 'US' && deskFedSeries?.series?.length >= 2) {
    return deskFedSeries;
  }
  if (apiSeries?.series?.length === 1) return apiSeries;
  return fromCal || apiSeries || deskFedSeries || null;
}

export function impactBadgeClass(impact) {
  const u = String(impact || '').toUpperCase();
  if (u === 'HIGH') return 'desk-rates__impact--high';
  if (u === 'MEDIUM') return 'desk-rates__impact--med';
  return 'desk-rates__impact--low';
}
