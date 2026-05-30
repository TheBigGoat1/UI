const GNEWS_BASE = "https://gnews.io/api/v4";

const getCryptoPanicBase = () => {
  const plan = import.meta.env.VITE_CRYPTOPANIC_API_PLAN || "developer";
  return `https://cryptopanic.com/api/${plan}/v2`;
};

const toIsoSafe = (value) => {
  try {
    return new Date(value).toISOString();
  } catch {
    return new Date().toISOString();
  }
};

const assetToCurrency = (asset = "") => {
  const cleaned = asset.replace(/[^A-Za-z]/g, "").toUpperCase();
  if (!cleaned) return "";
  if (cleaned.endsWith("USDT")) return cleaned.replace("USDT", "");
  if (cleaned.endsWith("USD")) return cleaned.replace("USD", "");
  if (cleaned.length > 6) return cleaned.slice(0, 6);
  return cleaned;
};

const normalizeGnews = (article) => ({
  title: article.title,
  description: article.description,
  source: article.source?.name || "GNews",
  url: article.url,
  publishedAt: toIsoSafe(article.publishedAt),
});

const normalizeCryptoPanic = (post) => ({
  title: post.title,
  description: post.description || post.slug || "",
  source: post.source?.title || "CryptoPanic",
  url: post.original_url || post.url,
  publishedAt: toIsoSafe(post.published_at),
});

export const getConfiguredFreeSources = () => ({
  gnews: Boolean(import.meta.env.VITE_GNEWS_API_KEY),
  cryptopanic: Boolean(import.meta.env.VITE_CRYPTOPANIC_API_KEY),
});

export const fetchFreeNews = async ({ query = "", asset = "", limit = 20 }) => {
  const gnewsKey = import.meta.env.VITE_GNEWS_API_KEY;
  const cryptoPanicKey = import.meta.env.VITE_CRYPTOPANIC_API_KEY;
  const search = (query || asset || "markets").trim();
  const currency = assetToCurrency(asset);

  const settled = await Promise.allSettled([
    (async () => {
      if (!gnewsKey) return [];
      const params = new URLSearchParams({
        q: search,
        lang: "en",
        max: String(Math.min(limit, 50)),
        token: gnewsKey,
      });
      const response = await fetch(`${GNEWS_BASE}/search?${params.toString()}`);
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`GNews failed (${response.status}): ${err}`);
      }
      const json = await response.json();
      return (json.articles || []).map(normalizeGnews);
    })(),
    (async () => {
      if (!cryptoPanicKey) return [];

      const params = new URLSearchParams({
        auth_token: cryptoPanicKey,
        public: "true",
        kind: "news",
        regions: "en",
      });

      if (currency) params.set("currencies", currency);
      else if (search && search.length <= 12) params.set("currencies", search.toUpperCase());

      const response = await fetch(
        `${getCryptoPanicBase()}/posts/?${params.toString()}`,
      );
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`CryptoPanic failed (${response.status}): ${err}`);
      }
      const json = await response.json();
      return (json.results || []).slice(0, limit).map(normalizeCryptoPanic);
    })(),
  ]);

  const allArticles = settled
    .filter((entry) => entry.status === "fulfilled")
    .flatMap((entry) => entry.value);

  const errors = settled
    .filter((entry) => entry.status === "rejected")
    .map((entry) => entry.reason?.message || "Unknown provider error");

  const uniqueByUrl = new Map();
  for (const article of allArticles) {
    const key = article.url || `${article.source}-${article.title}`;
    if (!uniqueByUrl.has(key)) uniqueByUrl.set(key, article);
  }

  const articles = Array.from(uniqueByUrl.values())
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, limit);

  return { articles, errors, sources: getConfiguredFreeSources() };
};
