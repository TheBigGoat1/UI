const STORAGE_KEY = 'insidr:chart-analysis-cache:v1';
const MAX_ENTRIES = 48;

function loadStore() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStore(store) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

export function cacheKeyForCandle(symbol, publishedAt, title) {
  const t = publishedAt ? new Date(publishedAt).getTime() : 0;
  const slug = String(title || '')
    .slice(0, 48)
    .replace(/\s+/g, '-')
    .toLowerCase();
  return `${String(symbol || '').toUpperCase()}::${t}::${slug}`;
}

export function getCachedCandleAnalysis(key) {
  const store = loadStore();
  const row = store[key];
  if (!row) return null;
  if (Date.now() - row.storedAt > 6 * 3600000) return null;
  return row.data;
}

export function setCachedCandleAnalysis(key, data) {
  const store = loadStore();
  store[key] = { storedAt: Date.now(), data };
  const keys = Object.keys(store);
  if (keys.length > MAX_ENTRIES) {
    keys
      .sort((a, b) => (store[a].storedAt || 0) - (store[b].storedAt || 0))
      .slice(0, keys.length - MAX_ENTRIES)
      .forEach((k) => delete store[k]);
  }
  saveStore(store);
}
