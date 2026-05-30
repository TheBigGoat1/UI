const store = new Map();

export async function cached(key, ttlMs, fn) {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;

  const value = await fn();
  store.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}

export function clearCache(prefix) {
  for (const key of store.keys()) {
    if (!prefix || key.startsWith(prefix)) store.delete(key);
  }
}
