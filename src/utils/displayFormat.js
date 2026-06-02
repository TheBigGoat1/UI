/**
 * Central display formatting for the MRKT terminal — no bare em-dash placeholders.
 * Use meaningful copy when live data is still syncing.
 */

export const LABEL = {
  SYNCING_PRICE: 'Syncing live quote',
  SYNCING_TREND: 'NEUTRAL',
  SYNCING_STRUCTURE: 'MIXED',
  SYNCING_CONFIDENCE: 'Building read',
  SYNCING_VIX: 'Loading VIX',
  SYNCING_LEVEL: 'Calculating level',
  SYNCING_TIME: 'Updating',
  SYNCING_MACRO: 'Not released',
  SYNCING_FORECAST: 'No consensus',
  SYNCING_PREVIOUS: 'No prior print',
  SYNCING_PCT: '0.00%',
  SYNCING_SESSION: 'Flat session',
  OFFLINE: 'Reconnecting to API',
};

export function formatPrice(value, symbol = '', { pending = false } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return pending ? LABEL.SYNCING_PRICE : LABEL.SYNCING_PRICE;
  const sym = String(symbol || '').toUpperCase();
  if (/JPY|XAU|XAG|US500|NAS|US30|ESUSD|NQUSD/.test(sym) || n >= 500) return n.toFixed(2);
  if (n >= 100) return n.toFixed(2);
  if (n >= 10) return n.toFixed(4);
  return n.toFixed(5);
}

export function formatChangePercent(value, { signed = true } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return LABEL.SYNCING_PCT;
  const prefix = signed && n > 0 ? '+' : '';
  return `${prefix}${n.toFixed(2)}%`;
}

export function formatChangeAbs(value, symbol = '') {
  const n = Number(value);
  if (!Number.isFinite(n)) return LABEL.SYNCING_PRICE;
  return formatPrice(Math.abs(n), symbol);
}

export function formatTrend(value) {
  if (!value) return LABEL.SYNCING_TREND;
  const t = String(value).toUpperCase().replace(/_/g, ' ');
  if (t === 'ALIGNED') return 'ALIGNED';
  if (t.includes('BULL')) return t.includes('STRONG') ? 'STRONG BULLISH' : 'BULLISH';
  if (t.includes('BEAR')) return t.includes('STRONG') ? 'STRONG BEARISH' : 'BEARISH';
  return t || LABEL.SYNCING_TREND;
}

export function formatStructure(value) {
  if (!value) return LABEL.SYNCING_STRUCTURE;
  return String(value).replace(/_/g, ' ');
}

export function formatConfidence(value) {
  if (value == null || !Number.isFinite(Number(value))) return LABEL.SYNCING_CONFIDENCE;
  const n = Number(value);
  const pct = n <= 1 ? Math.round(n * 100) : Math.round(n);
  return `${pct}%`;
}

export function formatVix(value) {
  if (value == null || !Number.isFinite(Number(value))) return LABEL.SYNCING_VIX;
  return Number(value).toFixed(1);
}

export function formatLevel(value, symbol = '') {
  if (value == null || !Number.isFinite(Number(value))) return LABEL.SYNCING_LEVEL;
  return formatPrice(Number(value), symbol);
}

export function formatMacroValue(value, kind = 'actual') {
  if (value == null || value === '') {
    if (kind === 'forecast') return LABEL.SYNCING_FORECAST;
    if (kind === 'previous') return LABEL.SYNCING_PREVIOUS;
    return LABEL.SYNCING_MACRO;
  }
  return String(value);
}

export function formatImpact(value) {
  if (!value) return 'MEDIUM';
  const v = String(value).toUpperCase();
  if (v === '3' || v === 'HIGH') return 'HIGH';
  if (v === '2' || v === 'MEDIUM') return 'MEDIUM';
  if (v === '1' || v === 'LOW') return 'LOW';
  return v;
}

export function formatRelativeSync(isoOrMs) {
  if (!isoOrMs) return 'just now';
  const ms = typeof isoOrMs === 'number' ? isoOrMs : new Date(isoOrMs).getTime();
  if (!Number.isFinite(ms)) return LABEL.SYNCING_TIME;
  const sec = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (sec < 2) return 'live now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  return new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function formatPanelTimestamp(iso) {
  if (!iso) return new Date().toLocaleString();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date().toLocaleString();
  return d.toLocaleString(undefined, {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatCountdownMinutes(minutes) {
  if (minutes == null || minutes < 0) return 'Past due';
  if (minutes < 1) return 'Under 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Readable wire headline — avoids double-uppercase in narrow columns. */
export function formatNewsHeadline(title) {
  const raw = String(title || '').trim();
  if (!raw) return '';
  const letters = raw.replace(/[^A-Za-z]/g, '');
  if (letters.length < 6) return raw;
  const upper = letters.replace(/[^A-Z]/g, '').length;
  if (upper / letters.length < 0.75) return raw;
  return raw
    .toLowerCase()
    .replace(/(^|[.!?]\s+)([a-z])/g, (_, prefix, char) => prefix + char.toUpperCase())
    .replace(/^\w/, (char) => char.toUpperCase());
}
