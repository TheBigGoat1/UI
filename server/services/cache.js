import { cacheGet, cacheSet } from "./redis.js";

const store = new Map();

export function hasRedisCache() {
  return Boolean(process.env.REDIS_URL);
}

/** TTL-aware cache — Redis when REDIS_URL is set, in-process Map fallback. */
export async function cached(key, ttlMs, fn) {
  const redisHit = await cacheGet(key);
  if (redisHit != null) return redisHit;

  const memHit = store.get(key);
  if (memHit && memHit.expires > Date.now()) return memHit.value;

  const value = await fn();
  const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));
  await cacheSet(key, value, ttlSec);
  store.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}

export function clearCache(prefix) {
  for (const key of store.keys()) {
    if (!prefix || key.startsWith(prefix)) store.delete(key);
  }
}
