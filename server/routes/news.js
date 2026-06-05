import { Router } from "express";
import { query } from "../db.js";
import { cached } from "../services/cache.js";
import {
  fetchAllNews,
  fetchAllNewsDetailed,
  getConfiguredNewsSources,
} from "../services/newsProviders.js";
import { getIntegrationsHealth } from "../services/integrationsHealth.js";

const router = Router();

let newsTableReady = false;

async function ensureNewsTable() {
  if (newsTableReady) return true;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS news_articles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source TEXT NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        summary TEXT,
        published_at TIMESTAMPTZ NOT NULL,
        symbols TEXT[] DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await query(
      `CREATE INDEX IF NOT EXISTS idx_news_articles_published ON news_articles(published_at DESC)`,
    );
    newsTableReady = true;
    return true;
  } catch (err) {
    console.warn("[news] Table ensure failed:", err.message);
    return false;
  }
}

function mapArticleRow(row) {
  return {
    title: row.title,
    description: row.summary,
    source: row.source,
    url: row.url,
    publishedAt: row.published_at,
    symbols: row.symbols,
  };
}

function mapLiveArticle(article) {
  return {
    title: article.title,
    description: article.summary,
    source: article.source,
    url: article.url,
    publishedAt: article.published_at,
    symbols: article.symbols || [],
  };
}

async function upsertArticles(articles) {
  const ok = await ensureNewsTable();
  if (!ok || !articles?.length) return 0;

  let inserted = 0;
  for (const article of articles) {
    if (!article?.title || !article?.url) continue;
    try {
      const result = await query(
        `INSERT INTO news_articles (source, title, url, summary, published_at, symbols)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (url) DO UPDATE SET
           title = EXCLUDED.title,
           summary = EXCLUDED.summary,
           published_at = EXCLUDED.published_at
         RETURNING id`,
        [
          article.source || "Unknown",
          article.title,
          article.url,
          article.summary || "",
          article.published_at || new Date().toISOString(),
          article.symbols || [],
        ],
      );
      if (result.rowCount) inserted += 1;
    } catch (err) {
      console.warn("[news] Upsert skip:", err.message);
    }
  }
  return inserted;
}

async function readFromDb(limit, offset = 0) {
  const ok = await ensureNewsTable();
  if (!ok) return [];
  const { rows } = await query(
    `SELECT source, title, url, summary, published_at, symbols
     FROM news_articles
     ORDER BY published_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  return rows.map(mapArticleRow);
}

const STALE_MS = 12 * 60 * 1000;

async function newestDbArticleAgeMs() {
  const ok = await ensureNewsTable();
  if (!ok) return Infinity;
  try {
    const { rows } = await query(
      `SELECT published_at FROM news_articles ORDER BY published_at DESC LIMIT 1`,
    );
    if (!rows[0]?.published_at) return Infinity;
    return Date.now() - new Date(rows[0].published_at).getTime();
  } catch {
    return Infinity;
  }
}

async function refreshLiveNews({ query = "", asset = "", limit = 40 } = {}) {
  const live = await fetchAllNews({ query, asset, limit });
  if (live.length) await upsertArticles(live);
  return live.map(mapLiveArticle);
}

/** Exported for background wire sync */
export async function refreshNewsWire(limit = 40) {
  return refreshLiveNews({ limit });
}

/** Always returns headlines — refreshes live when DB is empty or stale */
async function getHeadlines({ query = "", asset = "", limit = 20, offset = 0, forceLive = false }) {
  const age = await newestDbArticleAgeMs();
  if (forceLive || age > STALE_MS) {
    await refreshLiveNews({ query, asset, limit: Math.max(limit + offset, 40) });
  }

  let rows = await readFromDb(limit, offset);

  if (rows.length === 0) {
    const live = await refreshLiveNews({ query, asset, limit: Math.max(limit, 30) });
    rows = live.slice(offset, offset + limit);
  }

  return rows;
}

router.get("/feed", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 50);
    const { articles, breakdown } = await fetchAllNewsDetailed({ limit });
    const data = articles.map(mapLiveArticle);
    res.json({
      success: true,
      data,
      meta: { live: true, breakdown, sources: getConfiguredNewsSources() },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;
    const data = await getHeadlines({
      query: req.query.q || "",
      limit,
      offset,
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error("[news] GET /", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/latest", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const data = await getHeadlines({ limit, offset: 0 });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/sources", (_req, res) => {
  res.json({ success: true, data: getConfiguredNewsSources() });
});

router.post("/sync", async (_req, res) => {
  try {
    const { articles, breakdown } = await fetchAllNewsDetailed({ limit: 50 });
    const count = await upsertArticles(articles);
    res.json({
      success: true,
      data: {
        synced: count,
        totalFetched: articles.length,
        breakdown,
        sources: getConfiguredNewsSources(),
        preview: articles.slice(0, 5).map(mapLiveArticle),
      },
    });
  } catch (error) {
    console.error("[news] sync", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/connections", async (_req, res) => {
  try {
    const health = await getIntegrationsHealth();
    res.json({ success: true, data: health });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/stats", async (_req, res) => {
  try {
    const ok = await ensureNewsTable();
    if (!ok) {
      return res.json({
        success: true,
        data: { total: 0, sources: getConfiguredNewsSources(), db: false },
      });
    }
    const { rows } = await query(`SELECT COUNT(*)::int AS total FROM news_articles`);
    res.json({
      success: true,
      data: {
        total: rows[0]?.total || 0,
        sources: getConfiguredNewsSources(),
        db: true,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/search", async (req, res) => {
  try {
    const q = req.query.q || "";
    const articles = await fetchAllNews({ query: q, limit: 30 });
    await upsertArticles(articles);
    res.json({ success: true, data: articles.map(mapLiveArticle) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/asset/:symbol", async (req, res) => {
  try {
    const asset = String(req.params.symbol || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    const limit = Math.min(Number(req.query.limit) || 30, 60);
    const forceLive = req.query.fresh === "1" || req.query.live === "1";

    let data;
    if (forceLive) {
      const articles = await fetchAllNews({ asset, limit: Math.max(limit, 30) });
      await upsertArticles(articles);
      data = articles.map(mapLiveArticle);
    } else {
      data = await cached(`news:asset:${asset}:${limit}`, 30000, async () => {
        const articles = await fetchAllNews({ asset, limit: Math.max(limit, 30) });
        await upsertArticles(articles);
        return articles.map(mapLiveArticle);
      });
    }

    res.json({
      success: true,
      data,
      meta: { asset, scoped: true, count: data.length, live: true },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
