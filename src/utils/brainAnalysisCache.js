const STORAGE_KEY = 'insidr:calendar-analysis-cache:v1';
const MAX_ENTRIES = 32;
const TTL_MS = 15 * 60 * 1000;

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

export function cacheKeyForCalendarEvent(event, symbol = 'XAUUSD') {
  const sym = String(symbol || 'XAUUSD').toUpperCase();
  const id = event?.id || `${event?.event_name || event?.event}-${event?.event_time}`;
  return `${sym}::${id}`;
}

export function getCachedCalendarAnalysis(key) {
  const store = loadStore();
  const row = store[key];
  if (!row) return null;
  if (Date.now() - row.storedAt > TTL_MS) return null;
  return row.data;
}

export function setCachedCalendarAnalysis(key, data) {
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
