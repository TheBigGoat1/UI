/**
 * Chart candle intelligence — factual hover reads from OHLC + wire headlines only.
 */
import { formatNewsTime } from './newsAssets.js';
import {
  computeChartPriceRange,
  priceToYPercent,
  distributeChartMarkers,
  distributeFallbackPositions,
  distributeNewsLabelFloats,
} from './chartLayout.js';

const INTERVAL_SEC = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '4h': 14400,
  '1day': 86400,
  '1week': 604800,
};

export function intervalStepSec(interval) {
  return INTERVAL_SEC[String(interval || '1h').toLowerCase()] || 3600;
}

export function patchLiveBar(bars, livePrice) {
  if (!Array.isArray(bars) || !bars.length || !Number.isFinite(Number(livePrice))) return bars || [];
  const copy = bars.map((b) => ({ ...b }));
  const last = { ...copy[copy.length - 1] };
  const px = Number(livePrice);
  last.close = px;
  last.high = Math.max(Number(last.high) || px, px);
  last.low = Math.min(Number(last.low) || px, px);
  copy[copy.length - 1] = last;
  return copy;
}

function newsTimestamp(item) {
  const raw = item?.publishedAt || item?.time || item?.published_at;
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function newsInBarWindow(bar, interval, newsPool = []) {
  if (!bar?.time) return [];
  const step = intervalStepSec(interval) * 1000;
  const start = bar.time * 1000;
  const end = start + step;
  return (newsPool || [])
    .filter((n) => {
      const t = newsTimestamp(n);
      return t != null && t >= start && t < end;
    })
    .sort((a, b) => newsTimestamp(b) - newsTimestamp(a));
}

export function leadingNewsBeforeBar(bar, newsPool = [], hours = 8) {
  if (!bar?.time) return [];
  const barMs = bar.time * 1000;
  const from = barMs - hours * 3600000;
  return (newsPool || [])
    .filter((n) => {
      const t = newsTimestamp(n);
      return t != null && t >= from && t < barMs;
    })
    .sort((a, b) => newsTimestamp(b) - newsTimestamp(a))
    .slice(0, 5);
}

function formatBarTime(bar, interval) {
  const d = new Date(bar.time * 1000);
  const date = d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const session =
    interval === '1h' || interval === '4h'
      ? d.getUTCHours() >= 13 && d.getUTCHours() < 21
        ? 'London / NY'
        : d.getUTCHours() >= 7 && d.getUTCHours() < 16
          ? 'London'
          : 'Asia'
      : null;
  return session ? `${date} · ${session}` : date;
}

function formatPrice(symbol, n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  if (String(symbol).includes('USD') && v > 50) return v.toFixed(2);
  if (v >= 1000) return v.toFixed(2);
  if (v >= 10) return v.toFixed(4);
  return v.toFixed(5);
}

export function buildCandleHoverRead({
  bar,
  prevBar,
  symbol,
  interval,
  newsPool = [],
  isLiveTape = true,
}) {
  if (!bar) return null;

  const prevClose = prevBar?.close ?? bar.open;
  const ch = bar.close - prevClose;
  const pct = prevClose ? (ch / prevClose) * 100 : 0;
  const dir = pct > 0.02 ? 'up' : pct < -0.02 ? 'down' : 'flat';
  const dirLabel = dir === 'up' ? 'lifted' : dir === 'down' ? 'dropped' : 'held';

  const inBar = newsInBarWindow(bar, interval, newsPool);
  const leading = leadingNewsBeforeBar(bar, newsPool, 10);
  const primary = inBar[0] || leading[0];

  const moveLine = `${symbol} ${dirLabel} ${Math.abs(pct).toFixed(2)}% on this candle (O ${formatPrice(symbol, bar.open)} → C ${formatPrice(symbol, bar.close)}).`;

  let whatHappened;
  if (primary?.title) {
    whatHappened = primary.title;
  } else if (isLiveTape) {
    whatHappened = `No matched headline in the live feed for this bar — move is ${dirLabel} ${Math.abs(pct).toFixed(2)}% from prior close.`;
  } else {
    whatHappened = `Model candle — awaiting live history sync. Observed ${dirLabel} ${Math.abs(pct).toFixed(2)}% on this bar.`;
  }

  const whatLed = leading.length
    ? leading.slice(0, 3).map((n) => {
        const { ago } = formatNewsTime(n.publishedAt || n.time);
        return { title: (n.title || '').toUpperCase(), ago, item: n };
      })
    : [];

  return {
    bar,
    barTime: formatBarTime(bar, interval),
    moveLine,
    whatHappened,
    whatLed,
    headlines: inBar.slice(0, 4).map((n) => {
      const { ago } = formatNewsTime(n.publishedAt || n.time);
      return { title: (n.title || '').toUpperCase(), ago, item: n };
    }),
    primaryHeadline: primary
      ? {
          title: primary.title,
          summary: primary.description || primary.summary,
          publishedAt: primary.publishedAt || primary.time,
          item: primary,
        }
      : null,
    dir,
    pct,
    isLiveTape,
  };
}

export function computeBarLayout(bars, height = 400) {
  const list = (bars || []).slice(-80);
  if (list.length < 2) return null;

  const pad = { t: 12, r: 8, b: 22, l: 52 };
  const w = 800;
  const h = height;
  const chartW = w - pad.l - pad.r;
  const chartH = h - pad.t - pad.b;
  const lows = list.map((b) => b.low);
  const highs = list.map((b) => b.high);
  let min = Math.min(...lows);
  let max = Math.max(...highs);
  const span = max - min || max * 0.01 || 1;
  min -= span * 0.05;
  max += span * 0.05;

  const yScale = (v) => pad.t + chartH - ((v - min) / (max - min)) * chartH;
  const step = chartW / list.length;

  const columns = list.map((b, i) => {
    const xCenter = pad.l + i * step + step / 2;
    const leftPct = (xCenter / w) * 100;
    const topPct = (yScale(b.close) / h) * 100;
    return {
      bar: b,
      index: i,
      leftPct,
      topPct,
      xPct: (i + 0.5) / list.length,
    };
  });

  return { min, max, columns, barCount: list.length, padLeftPct: (pad.l / w) * 100, padRightPct: (pad.r / w) * 100 };
}

export function barIndexFromX(xPct, barCount) {
  if (!barCount) return 0;
  const idx = Math.floor(xPct * barCount);
  return Math.min(Math.max(0, idx), barCount - 1);
}

export function tradingSessionForDate(d) {
  const h = d.getUTCHours();
  if (h >= 13 && h < 21) return 'London / NY';
  if (h >= 7 && h < 16) return 'London';
  return 'Asia';
}

/** MRKT label meta — "Jun 4 - 2:00 PM - London" */
export function formatChartLabelMeta(timestamp) {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return '';
  const datePart = d.toLocaleString(undefined, { month: 'short', day: 'numeric' });
  const timePart = d.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${datePart} - ${timePart} - ${tradingSessionForDate(d)}`;
}

export function mapNewsToChartAnnotations(newsPool = [], bars = [], interval = '1h', _symbol = '') {
  if (!bars.length || !newsPool.length) return [];

  const layout = computeBarLayout(bars);
  if (!layout) return [];

  const range = computeChartPriceRange(bars);
  const used = new Set();
  const barUsage = new Map();
  const out = [];

  for (const item of newsPool) {
    const t = newsTimestamp(item);
    if (t == null) continue;

    let bestIdx = 0;
    let bestDist = Infinity;
    layout.columns.forEach((col, i) => {
      const dist = Math.abs(col.bar.time * 1000 - t);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    });

    const maxDist = intervalStepSec(interval) * 1000 * 2;
    if (bestDist > maxDist) continue;

    const col = layout.columns[bestIdx];
    const key = item.title;
    if (!key || used.has(key)) continue;
    used.add(key);

    const bar = col.bar;
    const slot = barUsage.get(bestIdx) || 0;
    barUsage.set(bestIdx, slot + 1);

    const bullish = Number(bar.close) >= Number(bar.open);
    const side = bullish ? 'above' : 'below';
    const anchorX = Math.min(90, Math.max(10, col.leftPct + slot * 1.5));
    const anchorY = priceToYPercent(
      bullish ? bar.high : bar.low,
      range.min,
      range.max,
    );
    const labelX = Math.min(86, Math.max(14, anchorX + (side === 'above' ? 10 : 8)));
    const labelY =
      side === 'above'
        ? Math.max(8, anchorY - 16 - slot * 9)
        : Math.min(90, anchorY + 16 + slot * 9);

    out.push({
      id: `news-${bestIdx}-${key.slice(0, 16)}`,
      anchorX,
      anchorY,
      labelX,
      labelY,
      side,
      left: anchorX,
      top: anchorY,
      text: item.title?.length > 140 ? `${item.title.slice(0, 137)}…` : item.title,
      sub: formatChartLabelMeta(t),
      item,
      bar,
    });
  }

  return distributeNewsLabelFloats(out.slice(0, 8), 11);
}

export function mapCalendarToChartAnnotations(events = [], bars = [], interval = '1h') {
  if (!bars.length || !events.length) return [];

  const layout = computeBarLayout(bars);
  if (!layout) return [];

  const step = intervalStepSec(interval) * 1000;
  const windowStart = bars[0].time * 1000;
  const windowEnd = bars[bars.length - 1].time * 1000 + step;

  const inWindow = (events || [])
    .filter((ev) => {
      const t = new Date(ev.event_time || ev.time).getTime();
      return Number.isFinite(t) && t >= windowStart && t <= windowEnd;
    })
    .sort((a, b) => new Date(a.event_time) - new Date(b.event_time));

  const out = [];
  for (const ev of inWindow) {
    const t = new Date(ev.event_time || ev.time).getTime();
    let bestIdx = 0;
    let bestDist = Infinity;
    layout.columns.forEach((col, i) => {
      const dist = Math.abs(col.bar.time * 1000 - t);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    });
    if (bestDist > step * 3) continue;

    const col = layout.columns[bestIdx];
    const name = (ev.event_name || ev.event || 'Event').trim();
    if (!name) continue;

    out.push({
      id: ev.id || `cal-${bestIdx}-${name.slice(0, 10)}`,
      left: col.leftPct,
      top: Math.max(10, col.topPct - 12),
      label: name.length > 20 ? `${name.slice(0, 17)}…` : name,
      impact: ev.importance || ev.impact,
      event: ev,
      kind: 'calendar',
    });
  }

  return distributeChartMarkers(out.slice(0, 8), 7);
}

export { distributeFallbackPositions } from './chartLayout.js';

export function headlineFromCandleRead(read, symbol) {
  if (read?.primaryHeadline?.title) {
    return {
      title: read.primaryHeadline.title,
      description: read.primaryHeadline.summary || read.moveLine,
      publishedAt: read.primaryHeadline.publishedAt || new Date(read.bar.time * 1000).toISOString(),
      source: 'candle_hover',
    };
  }
  return {
    title: `${symbol} — ${read?.barTime || 'session'} candle`,
    description: read?.moveLine || `Candle analysis for ${symbol}`,
    publishedAt: read?.bar ? new Date(read.bar.time * 1000).toISOString() : new Date().toISOString(),
    source: 'candle_session',
  };
}
