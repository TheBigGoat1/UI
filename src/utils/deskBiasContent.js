import { formatNewsTime, getPriceRow } from './newsAssets.js';
import { pctFromPriceRow } from './sectorFlowModel.js';

export const CENTRAL_BANKS = [
  { id: 'US', code: 'FED', label: 'Fed', currency: 'USD' },
  { id: 'EU', code: 'ECB', label: 'ECB', currency: 'EUR' },
  { id: 'GB', code: 'BOE', label: 'BoE', currency: 'GBP' },
  { id: 'JP', code: 'BOJ', label: 'BoJ', currency: 'JPY' },
  { id: 'AU', code: 'RBA', label: 'RBA', currency: 'AUD' },
  { id: 'NZ', code: 'RBNZ', label: 'RBNZ', currency: 'NZD' },
  { id: 'CA', code: 'BOC', label: 'BoC', currency: 'CAD' },
  { id: 'CN', code: 'PBOC', label: 'PBOC', currency: 'CNY' },
];

export const COUNTRY_FLAGS = {
  US: '🇺🇸',
  EU: '🇪🇺',
  GB: '🇬🇧',
  JP: '🇯🇵',
  AU: '🇦🇺',
  CA: '🇨🇦',
  CH: '🇨🇭',
  NZ: '🇳🇿',
  CN: '🇨🇳',
  DE: '🇩🇪',
  FR: '🇫🇷',
};

export function formatDeskUpdated(iso) {
  if (!iso) return 'recently';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function buildBullishBiasCards({ symbol, technical, selectedNews, brief, prices = {} }) {
  const ms = technical?.modules?.marketStructure;
  const lv = technical?.modules?.levels;
  const cards = [];
  const priceRow = getPriceRow(symbol, prices);
  const ch = priceRow?.synthetic ? 0 : pctFromPriceRow(prices, symbol);

  if (Number.isFinite(ch) && ch > 0.04) {
    cards.push({
      title: 'Session momentum positive',
      body: `${symbol} is ${ch >= 0 ? '+' : ''}${ch.toFixed(2)}% on the session — buyers control the tape until structure breaks.`,
    });
  }

  if (ms?.htf?.trend === 'BULLISH') {
    cards.push({
      title: 'Higher timeframe structure supports longs',
      body: `${symbol} HTF remains bullish — pullbacks into prior structure may attract buyers if LTF does not break down.`,
    });
  }
  if (ms?.alignment === 'ALIGNED' && ms?.ltf?.trend === 'BULLISH') {
    cards.push({
      title: 'Timeframes aligned bullish',
      body: 'HTF and LTF trends agree, which raises conviction for trend continuation rather than mean-reversion fades.',
    });
  }
  if (lv?.support) {
    cards.push({
      title: `Support at ${Number(lv.support).toFixed(2)}`,
      body: 'Defined support gives a clear invalidation for bullish bias — hold above keeps the day-trade long framework intact.',
    });
  }

  if (brief?.regime?.environment === 'RISK_ON') {
    const vix = brief?.regime?.vix;
    const short =
      vix != null && Number(vix) < 18
        ? 'Low fear regime — trends can extend; still respect heat limits.'
        : brief?.regime?.guidance?.slice(0, 140) ||
          'Risk-on tape — trends can extend; still respect heat limits.';
    cards.push({
      title: 'Risk-on regime (live VIX)',
      body: short,
    });
  }

  if (selectedNews?.title) {
    const { ago } = formatNewsTime(selectedNews.publishedAt || selectedNews.time);
    cards.push({
      title: 'Active headline',
      body: selectedNews.description || selectedNews.summary || selectedNews.title,
      news: {
        title: (selectedNews.title || '').toUpperCase(),
        ago,
      },
    });
  }

  if (!cards.length) {
    cards.push({
      title: 'Awaiting confirmation',
      body: technical?.summary || `No bullish structural signals yet on ${symbol} — wait for alignment.`,
    });
  }

  return cards;
}

export function buildBearishBiasCards({ symbol, technical, brief, prices = {} }) {
  const ms = technical?.modules?.marketStructure;
  const lv = technical?.modules?.levels;
  const cards = [];
  const priceRow = getPriceRow(symbol, prices);
  const ch = priceRow?.synthetic ? 0 : pctFromPriceRow(prices, symbol);

  if (Number.isFinite(ch) && ch < -0.04) {
    cards.push({
      title: 'Session momentum negative',
      body: `${symbol} is ${ch.toFixed(2)}% on the session — sellers dominate until a reclaim of prior structure.`,
    });
  }

  if (ms?.htf?.trend === 'BEARISH') {
    cards.push({
      title: 'HTF bearish structure',
      body: `Sustained acceptance below structure on ${symbol} would flip the day bias bearish.`,
    });
  }
  if (ms?.ltf?.trend === 'BEARISH' && ms?.htf?.trend !== 'BULLISH') {
    cards.push({
      title: 'LTF bearish',
      body: 'Lower timeframe trend is down — rallies may be sold until structure reclaims.',
    });
  }
  if (lv?.resistance) {
    cards.push({
      title: `Rejection at ${Number(lv.resistance).toFixed(2)}`,
      body: 'Failure above resistance invalidates bullish read for the session.',
    });
  }

  if (brief?.regime?.environment === 'RISK_OFF' && brief?.regime?.guidance) {
    cards.push({
      title: 'Risk-off regime (live VIX)',
      body: brief.regime.guidance,
    });
  }

  const vol = technical?.modules?.volatility;
  if (vol?.state === 'HIGH' || vol?.state === 'EXPANDING') {
    cards.push({
      title: 'Expanding volatility',
      body: 'Wider ranges increase stop-out risk — reduce size until direction accepts.',
    });
  }

  if (!cards.length) {
    cards.push({
      title: 'No active bearish triggers',
      body: `Monitor ${symbol} for HTF breakdown or risk-off headline before fading strength.`,
    });
  }

  return cards;
}

/** Surface the most desk-relevant cards first (MRKT shows ~2 per column). */
export function prioritizeBiasCards(cards, limit = 2, patterns = []) {
  const list = [...(cards || [])];
  if (!patterns.length) return list.slice(0, limit);
  list.sort((a, b) => {
    const rank = (title) => {
      const i = patterns.findIndex((re) => re.test(title));
      return i < 0 ? 99 : i;
    };
    return rank(a.title) - rank(b.title);
  });
  return list.slice(0, limit);
}

export function formatCalendarEventTime(eventTime) {
  if (!eventTime) return '—';
  const d = new Date(eventTime);
  const day = d.toLocaleDateString(undefined, { weekday: 'short' });
  const mon = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${day.toUpperCase()} ${mon} • ${time}`;
}

export function impactLabel(impact) {
  const v = String(impact || '').toUpperCase();
  if (v === 'HIGH' || v === '3') return { label: 'High', tone: 'high' };
  if (v === 'MEDIUM' || v === '2') return { label: 'Med', tone: 'med' };
  return { label: 'Low', tone: 'low' };
}

export function formatEventDateBlock(eventTime) {
  if (!eventTime) return { day: '—', date: '—', time: '—' };
  const d = new Date(eventTime);
  const day = d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
  const date = d
    .toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    .toUpperCase()
    .replace(' ', ' ');
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  return { day, date, time };
}

export function splitCalendarEvents(events) {
  const now = Date.now();
  const sorted = [...(events || [])].sort(
    (a, b) => new Date(a.event_time) - new Date(b.event_time),
  );
  const upcoming = sorted.filter((e) => new Date(e.event_time).getTime() >= now - 60000);
  const key = [];
  const other = [];
  upcoming.forEach((ev) => {
    const imp = String(ev.importance || ev.impact || '').toUpperCase();
    if (imp === 'HIGH' || imp === '3') key.push(ev);
    else other.push(ev);
  });
  if (!key.length && upcoming.length) {
    key.push(...upcoming.slice(0, 2));
    other.push(...upcoming.slice(2));
  } else if (!other.length) {
    other.push(...upcoming.filter((e) => !key.includes(e)));
  }
  return { key, other, all: upcoming };
}
