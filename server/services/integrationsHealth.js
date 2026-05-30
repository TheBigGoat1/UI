import { env, envBool, ENV_FILE } from "../config/env.js";
import { getConfiguredNewsSources } from "./newsProviders.js";

async function probeNewsApi() {
  const apiKey = env("NEWSAPI_API_KEY");
  if (!apiKey) return { configured: false, status: "not_configured" };
  try {
    const params = new URLSearchParams({
      country: "us",
      category: "business",
      pageSize: "1",
      apiKey,
    });
    const r = await fetch(`https://newsapi.org/v2/top-headlines?${params}`, {
      headers: { "User-Agent": "INSIDR/1.0" },
    });
    const json = await r.json();
    if (json.status === "error") {
      return { configured: true, status: "error", message: json.message };
    }
    return { configured: true, status: "ok", articles: json.totalResults ?? 0 };
  } catch (e) {
    return { configured: true, status: "error", message: e.message };
  }
}

async function probeNewsData() {
  const apiKey = env("NEWSDATA_API_KEY");
  if (!apiKey) return { configured: false, status: "not_configured" };
  try {
    const url = `https://newsdata.io/api/1/crypto?apikey=${encodeURIComponent(apiKey)}&language=en`;
    const r = await fetch(url, { headers: { "User-Agent": "INSIDR/1.0" } });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) {
      return {
        configured: true,
        status: "error",
        message: json.message || json.results?.message || `HTTP ${r.status}`,
      };
    }
    if (json.status && json.status !== "success") {
      return { configured: true, status: "error", message: json.message || json.status };
    }
    return {
      configured: true,
      status: "ok",
      articles: (json.results || []).length,
    };
  } catch (e) {
    return { configured: true, status: "error", message: e.message };
  }
}

async function probeCoinDesk() {
  try {
    const r = await fetch("https://www.coindesk.com/arc/outboundfeeds/rss/", {
      headers: { "User-Agent": "INSIDR/1.0", Accept: "application/rss+xml" },
    });
    return { configured: true, status: r.ok ? "ok" : "error", http: r.status };
  } catch (e) {
    return { configured: true, status: "error", message: e.message };
  }
}

async function probeCryptoPanic() {
  const token = env("CRYPTOPANIC_API_KEY") || env("VITE_CRYPTOPANIC_API_KEY");
  if (!token) return { configured: false, status: "not_configured" };
  if (token.startsWith("pub_")) {
    return {
      configured: true,
      status: "error",
      message:
        "This looks like a NewsData.io key (pub_…). Use CRYPTOPANIC_API_KEY from cryptopanic.com/developers/api/",
    };
  }
  try {
    const plan = env("CRYPTOPANIC_API_PLAN", "developer");
    const params = new URLSearchParams({
      auth_token: token,
      public: "true",
      kind: "news",
    });
    const r = await fetch(
      `https://cryptopanic.com/api/${plan}/v2/posts/?${params}`,
      { headers: { "User-Agent": "INSIDR/1.0" } },
    );
    if (!r.ok) {
      return { configured: true, status: "error", message: `HTTP ${r.status}` };
    }
    const json = await r.json();
    return {
      configured: true,
      status: "ok",
      articles: (json.results || []).length,
    };
  } catch (e) {
    return { configured: true, status: "error", message: e.message };
  }
}

async function probeTwelve() {
  const key = env("TWELVE_DATA_API_KEY") || env("VITE_TWELVE_DATA_API_KEY");
  if (!key) return { configured: false, status: "not_configured" };
  try {
    const r = await fetch(
      `https://api.twelvedata.com/price?symbol=EUR/USD&apikey=${encodeURIComponent(key)}`,
    );
    const json = await r.json();
    return {
      configured: true,
      status: json?.status === "error" ? "error" : "ok",
      message: json?.message,
    };
  } catch (e) {
    return { configured: true, status: "error", message: e.message };
  }
}

/** Live status for all integrations read from .env */
export async function getIntegrationsHealth() {
  const [newsApi, newsData, coindesk, cryptopanic, twelveData] = await Promise.all([
    probeNewsApi(),
    probeNewsData(),
    probeCoinDesk(),
    probeCryptoPanic(),
    probeTwelve(),
  ]);

  return {
    envFile: ENV_FILE,
    configured: getConfiguredNewsSources(),
    database: { status: "required", configured: true },
    binance: { status: "ok", configured: true, note: "Public API — no key" },
    yahoo: { status: "ok", configured: true, note: "FX/commodity fallback" },
    twelveData: {
      ...twelveData,
      note: "TWELVE_DATA_API_KEY in .env",
    },
    newsApi: {
      ...newsApi,
      note: "NEWSAPI_API_KEY — free tier uses top-headlines",
    },
    newsData: {
      ...newsData,
      note: "NEWSDATA_API_KEY in .env",
    },
    coindesk: {
      ...coindesk,
      note: "RSS — always on",
    },
    cryptopanic: {
      ...cryptopanic,
      note: "CRYPTOPANIC_API_KEY (not pub_ NewsData key)",
    },
    anthropic: {
      status: envBool("ANTHROPIC_API_KEY") ? "configured" : "not_configured",
      configured: envBool("ANTHROPIC_API_KEY"),
      note: "ANTHROPIC_API_KEY",
    },
    stripe: {
      status: envBool("STRIPE_SECRET_KEY") ? "configured" : "not_configured",
      configured: envBool("STRIPE_SECRET_KEY"),
      note: "STRIPE_SECRET_KEY",
    },
  };
}
