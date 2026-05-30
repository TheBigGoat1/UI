import Redis from "ioredis";

let redisClient = null;
const localStore = new Map();

function hasRedisConfig() {
  return Boolean(process.env.REDIS_URL);
}

export function getRedis() {
  if (!hasRedisConfig()) return null;
  if (redisClient) return redisClient;
  redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
  });
  redisClient.on("error", (err) => {
    console.warn("[redis] connection error:", err.message);
  });
  return redisClient;
}

export async function cacheGet(key) {
  const redis = getRedis();
  if (redis) {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  }
  const hit = localStore.get(key);
  if (!hit || hit.expires < Date.now()) return null;
  return hit.value;
}

export async function cacheSet(key, value, ttlSec = 30) {
  const redis = getRedis();
  if (redis) {
    await redis.set(key, JSON.stringify(value), "EX", ttlSec);
    return;
  }
  localStore.set(key, { value, expires: Date.now() + ttlSec * 1000 });
}

export async function pub(channel, payload) {
  const redis = getRedis();
  if (!redis) return;
  await redis.publish(channel, JSON.stringify(payload));
}

export function isRedisConfigured() {
  return hasRedisConfig();
}

export async function probeRedis() {
  if (!hasRedisConfig()) {
    return { configured: false, status: "not_configured", note: "REDIS_URL in .env (Upstash / Redis Cloud)" };
  }
  try {
    const redis = getRedis();
    const pong = await redis.ping();
    return {
      configured: true,
      status: pong === "PONG" ? "ok" : "error",
      note: "Shared cache for quotes, OHLC, and rate-limit relief",
    };
  } catch (e) {
    return { configured: true, status: "error", message: e.message };
  }
}
