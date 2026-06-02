import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path to project .env (UI-main/.env) */
export const ENV_FILE = path.resolve(__dirname, "../../.env");

const loaded = dotenv.config({ path: ENV_FILE });

const TRIMMED_KEYS = [
  "NEWSAPI_API_KEY",
  "NEWSDATA_API_KEY",
  "CRYPTOPANIC_API_KEY",
  "VITE_CRYPTOPANIC_API_KEY",
  "TWELVE_DATA_API_KEY",
  "VITE_TWELVE_DATA_API_KEY",
  "ANTHROPIC_API_KEY",
  "STRIPE_SECRET_KEY",
  "DATABASE_URL",
  "JWT_SECRET",
];

/** Trim whitespace from .env values (common copy-paste issue). */
export function normalizeEnv() {
  for (const key of TRIMMED_KEYS) {
    const raw = process.env[key];
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed !== raw) process.env[key] = trimmed;
    }
  }
}

normalizeEnv();

export function env(key, fallback = "") {
  const v = process.env[key];
  if (v == null || v === "") return fallback;
  return String(v).trim();
}

export function envBool(key) {
  return Boolean(env(key));
}

export function logEnvBoot() {
  if (loaded.error && loaded.error.code !== "ENOENT") {
    console.warn(`[env] Could not load ${ENV_FILE}:`, loaded.error.message);
  } else {
    console.log(`[env] Loaded keys from ${ENV_FILE}`);
  }
  const flags = {
    newsapi: envBool("NEWSAPI_API_KEY"),
    newsdata: envBool("NEWSDATA_API_KEY"),
    cryptopanic: envBool("CRYPTOPANIC_API_KEY"),
    twelve: envBool("TWELVE_DATA_API_KEY"),
    anthropic: envBool("ANTHROPIC_API_KEY"),
    stripe: envBool("STRIPE_SECRET_KEY"),
  };
  console.log("[env] API keys:", flags);
}
