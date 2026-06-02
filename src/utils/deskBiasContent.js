import { formatNewsTime, getPriceRow } from './newsAssets.js';
import { pctFromPriceRow } from './sectorFlowModel.js';
import {
  formatPrice,
  formatChangePercent,
  formatVix,
  formatLevel,
  LABEL,
} from './displayFormat.js';

function evidenceChip(label, value) {
  if (value == null || value === '' || value === LABEL.SYNCING_PCT) return null;
  return { label, value: String(value) };
}

function withEvidence(card, chips) {
  const evidence = (chips || []).filter(Boolean);
  return evidence.length ? { ...card, evidence } : card;
}

function distPct(from, to) {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return null;
  return ((to - from) / from) * 100;
}

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
  const mom = technical?.modules?.momentum;
  const vol = technical?.modules?.volatility;
  const cards = [];
  const priceRow = getPriceRow(symbol, prices);
  const ch = priceRow?.synthetic ? 0 : pctFromPriceRow(prices, symbol);
  const last = lv?.last ?? priceRow?.price;
  const conf = technical?.confidence;

  if (Number.isFinite(ch) && ch > 0.02) {
    cards.push(
      withEvidence(
        {
          title: 'Session momentum positive',
          body: `${symbol} is ${formatChangePercent(ch)} on the live tape — buyers control the session until structure breaks below key support.`,
        },
        [
          evidenceChip('Session', formatChangePercent(ch)),
          evidenceChip('Last', formatPrice(last, symbol)),
        ],
      ),
    );
  } else if (Number.isFinite(ch) && ch > -0.02 && ch <= 0.02) {
    cards.push(
      withEvidence(
        {
          title: 'Session flat — no trend edge',
          body: `${symbol} is consolidating (${formatChangePercent(ch)}) — wait for a break above resistance or momentum pickup before adding long conviction.`,
        },
        [evidenceChip('Session', formatChangePercent(ch)), evidenceChip('Last', formatPrice(last, symbol))],
      ),
    );
  }

  if (mom?.rsi != null && Number.isFinite(Number(mom.rsi))) {
    const rsi = Math.round(Number(mom.rsi));
    const st = mom.state || (rsi >= 70 ? 'OVERBOUGHT' : rsi <= 30 ? 'OVERSOLD' : 'NEUTRAL');
    if (rsi <= 55 || (rsi > 55 && rsi < 70 && ms?.ltf?.trend === 'BULLISH')) {
      cards.push(
        withEvidence(
          {
            title: `Momentum: RSI ${rsi} (${st})`,
            body:
              rsi >= 70
                ? `${symbol} RSI ${rsi} is stretched — trend can extend but tighten risk; only add on pullbacks to structure.`
                : rsi <= 40
                  ? `RSI ${rsi} has room to run higher — momentum not yet overbought on the active chart timeframe.`
                  : `RSI ${rsi} supports constructive momentum without extreme overbought readings.`,
          },
          [evidenceChip('RSI', String(rsi)), evidenceChip('Momentum', st)],
        ),
      );
    }
  }

  if (ms?.htf?.trend === 'BULLISH') {
    cards.push(
      withEvidence(
        {
          title: 'Higher timeframe structure supports longs',
          body: `${symbol} HTF (${ms.htf.label || 'HTF'}) remains bullish — pullbacks into prior structure may attract buyers if LTF does not break down.`,
        },
        [evidenceChip('HTF', 'BULLISH'), evidenceChip('Align', ms?.alignment || 'MIXED')],
      ),
    );
  }
  if (ms?.alignment === 'ALIGNED' && ms?.ltf?.trend === 'BULLISH') {
    cards.push(
      withEvidence(
        {
          title: 'Timeframes aligned bullish',
          body: 'HTF and LTF trends agree, which raises conviction for trend continuation rather than mean-reversion fades.',
        },
        [
          evidenceChip('HTF', ms.htf.trend),
          evidenceChip('LTF', ms.ltf.trend),
          evidenceChip('Align', 'ALIGNED'),
        ],
      ),
    );
  }
  if (ms?.ltf?.trend === 'BULLISH' && ms?.htf?.trend !== 'BULLISH') {
    cards.push(
      withEvidence(
        {
          title: 'LTF bullish vs mixed HTF',
          body: 'Lower timeframe is bid-led — intraday longs can work with tight stops if HTF eventually confirms.',
        },
        [evidenceChip('LTF', 'BULLISH'), evidenceChip('HTF', ms?.htf?.trend || 'NEUTRAL')],
      ),
    );
  }
  if (lv?.support && last) {
    const d = distPct(lv.support, last);
    cards.push(
      withEvidence(
        {
          title: `Support at ${formatLevel(lv.support, symbol)}`,
          body:
            d != null && d > 0
              ? `Price holds ${d.toFixed(2)}% above support — bullish bias stays intact while above ${formatLevel(lv.support, symbol)}.`
              : 'Defined support gives a clear invalidation for bullish bias — hold above keeps the day-trade long framework intact.',
        },
        [
          evidenceChip('Support', formatLevel(lv.support, symbol)),
          evidenceChip('Last', formatPrice(last, symbol)),
          d != null ? evidenceChip('vs support', `${d >= 0 ? '+' : ''}${d.toFixed(2)}%`) : null,
        ],
      ),
    );
  }
  if (lv?.resistance && last) {
    const d = distPct(last, lv.resistance);
    if (d != null && d < 0.35) {
      cards.push(
        withEvidence(
          {
            title: `Approaching resistance ${formatLevel(lv.resistance, symbol)}`,
            body: `Only ${d.toFixed(2)}% below resistance — breakout acceptance would accelerate bullish follow-through.`,
          },
          [
            evidenceChip('Resistance', formatLevel(lv.resistance, symbol)),
            evidenceChip('Distance', `${d.toFixed(2)}%`),
          ],
        ),
      );
    }
  }

  if (vol?.atrPct != null) {
    cards.push(
      withEvidence(
        {
          title: `Volatility: ${vol.state || 'NORMAL'} (ATR ${Number(vol.atrPct).toFixed(2)}%)`,
          body:
            vol.state === 'HIGH' || vol.state === 'EXPANDING'
              ? 'Wider ranges — use smaller size but directional moves can travel further when trend accepts.'
              : 'Contained volatility favors structured trend trades with defined levels.',
        },
        [evidenceChip('ATR', `${Number(vol.atrPct).toFixed(2)}%`), evidenceChip('Regime', vol.state)],
      ),
    );
  }

  if (conf != null && Number.isFinite(Number(conf))) {
    cards.push(
      withEvidence(
        {
          title: `Model confidence ${Math.round(Number(conf))}%`,
          body: 'Multi-timeframe technical stack agrees enough to assign elevated conviction on this directional read.',
        },
        [evidenceChip('Confidence', `${Math.round(Number(conf))}%`), evidenceChip('Bias', technical?.bias || 'neutral')],
      ),
    );
  }

  if (brief?.regime?.environment === 'RISK_ON') {
    const vix = brief?.regime?.vix;
    cards.push(
      withEvidence(
        {
          title: 'Risk-on regime (live VIX)',
          body:
            vix != null && Number(vix) < 18
              ? `VIX ${formatVix(vix)} — low fear regime; beta and cyclicals tend to outperform; still respect heat limits.`
              : brief?.regime?.guidance?.slice(0, 200) ||
                'Risk-on tape — trends can extend; still respect heat limits.',
        },
        [
          evidenceChip('Regime', 'RISK_ON'),
          evidenceChip('VIX', formatVix(vix)),
        ],
      ),
    );
  }

  if (selectedNews?.title) {
    const { ago } = formatNewsTime(selectedNews.publishedAt || selectedNews.time);
    cards.push(
      withEvidence(
        {
          title: 'Active headline (selected)',
          body: selectedNews.description || selectedNews.summary || selectedNews.title,
          news: {
            title: (selectedNews.title || '').toUpperCase(),
            ago,
          },
        },
        [evidenceChip('Wire', ago)],
      ),
    );
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
  const mom = technical?.modules?.momentum;
  const vol = technical?.modules?.volatility;
  const cards = [];
  const priceRow = getPriceRow(symbol, prices);
  const ch = priceRow?.synthetic ? 0 : pctFromPriceRow(prices, symbol);
  const last = lv?.last ?? priceRow?.price;
  const conf = technical?.confidence;

  if (Number.isFinite(ch) && ch < -0.02) {
    cards.push(
      withEvidence(
        {
          title: 'Session momentum negative',
          body: `${symbol} is ${formatChangePercent(ch)} on the live tape — sellers dominate until a reclaim of prior structure.`,
        },
        [
          evidenceChip('Session', formatChangePercent(ch)),
          evidenceChip('Last', formatPrice(last, symbol)),
        ],
      ),
    );
  }

  if (mom?.rsi != null && Number.isFinite(Number(mom.rsi))) {
    const rsi = Math.round(Number(mom.rsi));
    const st = mom.state || (rsi >= 70 ? 'OVERBOUGHT' : rsi <= 30 ? 'OVERSOLD' : 'NEUTRAL');
    if (rsi >= 65 || (rsi <= 35 && ms?.ltf?.trend === 'BEARISH')) {
      cards.push(
        withEvidence(
          {
            title: `Momentum: RSI ${rsi} (${st})`,
            body:
              rsi >= 70
                ? `RSI ${rsi} overbought — exhaustion risk rises; rallies may fade into resistance.`
                : rsi <= 35
                  ? `RSI ${rsi} weak — bears control momentum on the active timeframe.`
                  : `RSI ${rsi} leans against longs without fresh demand.`,
          },
          [evidenceChip('RSI', String(rsi)), evidenceChip('Momentum', st)],
        ),
      );
    }
  }

  if (ms?.htf?.trend === 'BEARISH') {
    cards.push(
      withEvidence(
        {
          title: 'HTF bearish structure',
          body: `Sustained acceptance below structure on ${symbol} (${ms.htf.label || 'HTF'}) supports bearish day bias.`,
        },
        [evidenceChip('HTF', 'BEARISH'), evidenceChip('Align', ms?.alignment || 'MIXED')],
      ),
    );
  }
  if (ms?.ltf?.trend === 'BEARISH' && ms?.htf?.trend !== 'BULLISH') {
    cards.push(
      withEvidence(
        {
          title: 'LTF bearish',
          body: 'Lower timeframe trend is down — rallies may be sold until structure reclaims.',
        },
        [evidenceChip('LTF', 'BEARISH'), evidenceChip('HTF', ms?.htf?.trend || 'NEUTRAL')],
      ),
    );
  }
  if (ms?.alignment === 'CONFLICTING') {
    cards.push(
      withEvidence(
        {
          title: 'Timeframe conflict — reduce size',
          body: 'HTF and chart timeframe disagree — directional trades carry lower conviction until alignment returns.',
        },
        [evidenceChip('HTF', ms?.htf?.trend), evidenceChip('LTF', ms?.ltf?.trend)],
      ),
    );
  }
  if (lv?.resistance && last) {
    const d = distPct(last, lv.resistance);
    cards.push(
      withEvidence(
        {
          title: `Resistance at ${formatLevel(lv.resistance, symbol)}`,
          body:
            d != null && d >= -0.15
              ? `Price ${d <= 0 ? `${Math.abs(d).toFixed(2)}% below` : 'near'} resistance — failure to break keeps bearish read in play.`
              : 'Failure above resistance invalidates bullish read for the session.',
        },
        [
          evidenceChip('Resistance', formatLevel(lv.resistance, symbol)),
          evidenceChip('Last', formatPrice(last, symbol)),
        ],
      ),
    );
  }
  if (lv?.support && last) {
    const d = distPct(lv.support, last);
    if (d != null && d < 0.25) {
      cards.push(
        withEvidence(
          {
            title: `Support test ${formatLevel(lv.support, symbol)}`,
            body: `Only ${d.toFixed(2)}% above support — loss of this level would accelerate bearish follow-through.`,
          },
          [evidenceChip('Support', formatLevel(lv.support, symbol)), evidenceChip('Buffer', `${d.toFixed(2)}%`)],
        ),
      );
    }
  }

  if (brief?.regime?.environment === 'RISK_OFF' && brief?.regime?.guidance) {
    cards.push(
      withEvidence(
        {
          title: 'Risk-off regime (live VIX)',
          body: brief.regime.guidance,
        },
        [
          evidenceChip('Regime', 'RISK_OFF'),
          evidenceChip('VIX', formatVix(brief?.regime?.vix)),
        ],
      ),
    );
  }

  if (vol?.state === 'HIGH' || vol?.state === 'EXPANDING') {
    cards.push(
      withEvidence(
        {
          title: 'Expanding volatility',
          body: `ATR ${vol.atrPct != null ? `${Number(vol.atrPct).toFixed(2)}%` : 'elevated'} — wider ranges increase stop-out risk; fade extremes or trade smaller.`,
        },
        [evidenceChip('ATR', vol.atrPct != null ? `${Number(vol.atrPct).toFixed(2)}%` : 'HIGH'), evidenceChip('State', vol.state)],
      ),
    );
  }

  if (conf != null && Number.isFinite(Number(conf)) && Number(conf) < 55) {
    cards.push(
      withEvidence(
        {
          title: `Lower model confidence (${Math.round(Number(conf))}%)`,
          body: 'Technical stack is mixed — treat directional bias as provisional until structure and tape align.',
        },
        [evidenceChip('Confidence', `${Math.round(Number(conf))}%`)],
      ),
    );
  }

  if (!cards.length) {
    cards.push({
      title: 'No active bearish triggers',
      body: `Monitor ${symbol} for HTF breakdown or risk-off headline before fading strength.`,
    });
  }

  return cards;
}

/** Surface the most desk-relevant cards first. */
export function prioritizeBiasCards(cards, limit = 8, patterns = []) {
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
