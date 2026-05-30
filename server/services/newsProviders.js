import { env, envBool } from "../config/env.js";

const getCryptoPanicBase = () => {
  const plan = env("CRYPTOPANIC_API_PLAN", "developer");
  return `https://cryptopanic.com/api/${plan}/v2`;
};

const toIsoSafe = (value) => {
  try {
    return new Date(value).toISOString();
  } catch {
    return new Date().toISOString();
  }
};

function rssTag(block, name) {
  const cdata = new RegExp(
    `<${name}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${name}>`,
    "i",
  );
  const plain = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i");
  const m = block.match(cdata) || block.match(plain);
  return (m?.[1] || "").trim();
}

/** Which news backends have keys configured (server-side only). */
function cryptopanicKey() {
  const key = env("CRYPTOPANIC_API_KEY") || env("VITE_CRYPTOPANIC_API_KEY");
  if (!key || key.startsWith("pub_")) return "";
  return key;
}

export function getConfiguredNewsSources() {
  return {
    newsapi: envBool("NEWSAPI_API_KEY"),
    newsdata: envBool("NEWSDATA_API_KEY"),
    coindesk: true,
    cryptopanic: Boolean(cryptopanicKey()),
    gnews: envBool("GNEWS_API_KEY") || envBool("VITE_GNEWS_API_KEY"),
  };
}

function buildSearchQuery(query, asset) {
  const currency = String(asset || "")
    .replace(/USDT|USD/gi, "")
    .toUpperCase();
  if (query) return query;
  if (currency) return `${currency} cryptocurrency`;
  return "cryptocurrency OR bitcoin OR forex markets";
}

export async function fetchNewsApi({ query = "", asset = "", limit = 20 }) {
  const apiKey = env("NEWSAPI_API_KEY");
  if (!apiKey) return [];

  const explicitQ = String(query || "").trim();
  const assetQ = asset
    ? `${String(asset).replace(/USDT|USD/gi, "")} forex OR cryptocurrency`
    : "";
  const searchQ =
    explicitQ && explicitQ.toLowerCase() !== "markets"
      ? explicitQ
      : asset
        ? assetQ
        : "";
  const pageSize = String(Math.min(limit, 100));
  const params = new URLSearchParams({
    language: "en",
    pageSize,
    apiKey,
  });

  if (searchQ.length > 2) {
    params.set("q", searchQ.slice(0, 200));
  } else {
    params.set("category", "business");
    params.set("country", "us");
  }

  const response = await fetch(
    `https://newsapi.org/v2/top-headlines?${params.toString()}`,
    { headers: { "User-Agent": "INSIDR/1.0" } },
  );
  if (!response.ok) throw new Error(`NewsAPI ${response.status}`);

  const json = await response.json();
  if (json.status === "error") throw new Error(json.message || "NewsAPI error");

  return (json.articles || []).slice(0, limit).map((article) => ({
    source: article.source?.name || "NewsAPI",
    title: article.title,
    url: article.url,
    summary: article.description || "",
    published_at: toIsoSafe(article.publishedAt),
    symbols: [],
  }));
}

function mapNewsDataArticle(article) {
  return {
    source: article.source_name || article.source_id || "NewsData.io",
    title: article.title,
    url: article.link,
    summary: article.description || article.content || "",
    published_at: toIsoSafe(article.pubDate),
    symbols: (article.coin || article.coins || [])
      .map((c) => (typeof c === "string" ? c : c?.name || c?.symbol))
      .filter(Boolean),
  };
}

export async function fetchNewsData({ query = "", asset = "", limit = 20 }) {
  const apiKey = env("NEWSDATA_API_KEY");
  if (!apiKey) return [];

  const q = query || asset.replace(/USDT|USD/gi, "") || "cryptocurrency";
  const endpoints = [
    `https://newsdata.io/api/1/crypto?${new URLSearchParams({ apikey: apiKey, q, language: "en" })}`,
    `https://newsdata.io/api/1/news?${new URLSearchParams({ apikey: apiKey, q, category: "business", language: "en" })}`,
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": "INSIDR/1.0" } });
      if (!response.ok) continue;
      const json = await response.json();
      if (json.status && json.status !== "success") continue;
      const rows = (json.results || []).slice(0, limit).map(mapNewsDataArticle);
      if (rows.length) return rows;
    } catch {
      /* try next endpoint */
    }
  }

  return [];
}

/** CoinDesk RSS — no API key required */
export async function fetchCoinDeskRss({ limit = 20 }) {
  const response = await fetch("https://www.coindesk.com/arc/outboundfeeds/rss/", {
    headers: { "User-Agent": "INSIDR/1.0", Accept: "application/rss+xml" },
  });
  if (!response.ok) throw new Error(`CoinDesk RSS ${response.status}`);

  const xml = await response.text();
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

  return blocks
    .slice(0, limit)
    .map((block) => ({
      source: "CoinDesk",
      title: rssTag(block, "title"),
      url: rssTag(block, "link"),
      summary: rssTag(block, "description").replace(/<[^>]+>/g, "").slice(0, 400),
      published_at: toIsoSafe(rssTag(block, "pubDate")),
      symbols: [],
    }))
    .filter((item) => item.title && item.url);
}

function mapCryptoPanicPost(post) {
  return {
    source: post.source?.title || "CryptoPanic",
    title: post.title,
    url: post.original_url || post.url,
    summary: post.description || "",
    published_at: toIsoSafe(post.published_at),
    symbols: (post.instruments || []).map((i) => i.code).filter(Boolean),
  };
}

export async function fetchCryptoPanic({ currencies = "", limit = 20 }) {
  const authToken = cryptopanicKey();
  if (!authToken) return [];

  const params = new URLSearchParams({
    auth_token: authToken,
    public: "true",
    kind: "news",
    regions: "en",
  });
  if (currencies) params.set("currencies", currencies);

  const urls = [
    `${getCryptoPanicBase()}/posts/?${params.toString()}`,
    `https://cryptopanic.com/api/v1/posts/?${params.toString()}`,
    `https://cryptopanic.com/api/posts/?${params.toString()}`,
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": "INSIDR/1.0" } });
      if (!response.ok) continue;
      const json = await response.json();
      const rows = (json.results || []).slice(0, limit).map(mapCryptoPanicPost);
      if (rows.length) return rows;
    } catch {
      /* next url */
    }
  }

  return [];
}

/** Legacy GNews — optional fallback only */
export async function fetchGNews({ query = "markets", limit = 20 }) {
  const token = env("GNEWS_API_KEY") || env("VITE_GNEWS_API_KEY");
  if (!token) return [];

  const params = new URLSearchParams({
    q: query,
    lang: "en",
    max: String(Math.min(limit, 50)),
    token,
  });

  const response = await fetch(`https://gnews.io/api/v4/search?${params.toString()}`);
  if (!response.ok) throw new Error(`GNews ${response.status}`);

  const json = await response.json();
  return (json.articles || []).map((article) => ({
    source: article.source?.name || "GNews",
    title: article.title,
    url: article.url,
    summary: article.description,
    published_at: toIsoSafe(article.publishedAt),
    symbols: [],
  }));
}

export async function fetchAllNews({ query = "", asset = "", limit = 20 }) {
  const { articles } = await fetchAllNewsDetailed({ query, asset, limit });
  return articles;
}

export async function fetchAllNewsDetailed({ query = "", asset = "", limit = 20 }) {
  const currency = asset.replace(/USDT|USD/gi, "").toUpperCase() || "";
  const perSource = Math.max(8, Math.ceil(limit / 4));
  const sources = getConfiguredNewsSources();
  const breakdown = {};

  const labeled = [
    sources.newsapi
      ? { name: "newsapi", run: () => fetchNewsApi({ query, asset, limit: perSource }) }
      : null,
    sources.newsdata
      ? { name: "newsdata", run: () => fetchNewsData({ query, asset, limit: perSource }) }
      : null,
    { name: "coindesk", run: () => fetchCoinDeskRss({ limit: perSource }) },
    sources.cryptopanic
      ? {
          name: "cryptopanic",
          run: () => fetchCryptoPanic({ currencies: currency, limit: perSource }),
        }
      : null,
  ].filter(Boolean);

  if (sources.gnews && !sources.newsapi) {
    labeled.push({
      name: "gnews",
      run: () => fetchGNews({ query: query || asset || "markets", limit: perSource }),
    });
  }

  const articles = [];
  await Promise.all(
    labeled.map(async ({ name, run }) => {
      try {
        const rows = await run();
        breakdown[name] = { ok: true, count: rows.length };
        articles.push(...rows);
      } catch (err) {
        breakdown[name] = { ok: false, error: err.message };
      }
    }),
  );

  const map = new Map();
  for (const item of articles) {
    if (item.url && !map.has(item.url)) map.set(item.url, item);
  }

  const merged = Array.from(map.values())
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
    .slice(0, limit);

  return { articles: merged, breakdown };
}
