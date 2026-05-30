import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { logEnvBoot } from "./config/env.js";
import { query } from "./db.js";

import authRoutes from "./routes/auth.js";
import billingRoutes, { handleStripeWebhook } from "./routes/billing.js";
import journalRoutes from "./routes/journal.js";
import connectionsRoutes from "./routes/connections.js";
import systemRoutes from "./routes/system.js";
import newsRoutes from "./routes/news.js";
import marketRoutes from "./routes/market.js";
import analysisRoutes from "./routes/analysis.js";
import ideasRoutes from "./routes/ideas.js";
import tradesRoutes from "./routes/trades.js";
import calendarRoutes from "./routes/calendar.js";
import backtestRoutes from "./routes/backtest.js";
import portfolioRoutes from "./routes/portfolio.js";
import sentimentRoutes from "./routes/sentiment.js";
import chatRoutes from "./routes/chat.js";
import adminRoutes from "./routes/admin.js";
import alertsRoutes from "./routes/alerts.js";
import economyRoutes from "./routes/economy.js";
import briefRoutes from "./routes/brief.js";
import traderRoutes from "./routes/trader.js";
import { initRealtime } from "./realtime/hub.js";
import { attachCorrelationId, requestLogger } from "./middleware/observability.js";
import { ensureMacroDataReady } from "./services/macroBootstrap.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
logEnvBoot();

const app = express();

app.use(cors({ origin: true, credentials: true }));

app.post(
  "/api/v1/billing/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook,
);

app.use(express.json());
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ success: false, error: "Invalid JSON in request body." });
  }
  next(err);
});
app.use(attachCorrelationId);
app.use(requestLogger);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/billing", billingRoutes);
app.use("/api/v1", systemRoutes);
app.use("/api/v1/journal", journalRoutes);
app.use("/api/v1/connections", connectionsRoutes);
app.use("/api/v1/news", newsRoutes);
app.use("/api/v1/market", marketRoutes);
app.use("/api/v1/analysis", analysisRoutes);
app.use("/api/v1/ideas", ideasRoutes);
app.use("/api/v1/trades", tradesRoutes);
app.use("/api/v1/calendar", calendarRoutes);
app.use("/api/v1/backtest", backtestRoutes);
app.use("/api/v1/portfolio", portfolioRoutes);
app.use("/api/v1/sentiment", sentimentRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/alerts", alertsRoutes);
app.use("/api/v1/economy", economyRoutes);
app.use("/api/v1/brief", briefRoutes);
app.use("/api/v1/trader", traderRoutes);

app.get("/", (_req, res) => {
  res.json({ ok: true, message: "INSIDR API running", docs: "/api/v1/health" });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ success: false, error: err.message || "Server error" });
});

const server = http.createServer(app);
initRealtime(server);

const PREFERRED_PORT = Number(process.env.PORT) || 3001;
const PORT_CANDIDATES = [...new Set([PREFERRED_PORT, 3002, 3003, 3004])];

function listenOnPort(port) {
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      server.off("listening", onListening);
      reject(err);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve(port);
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port);
  });
}

(async () => {
  let boundPort = null;
  for (const port of PORT_CANDIDATES) {
    try {
      boundPort = await listenOnPort(port);
      break;
    } catch (err) {
      if (err?.code !== "EADDRINUSE") {
        console.error(err);
        process.exit(1);
      }
      console.warn(`[api] Port ${port} in use — trying next…`);
    }
  }
  if (boundPort == null) {
    console.error("[api] No free port in", PORT_CANDIDATES.join(", "));
    process.exit(1);
  }

  console.log(`INSIDR API listening on http://localhost:${boundPort}`);
  console.log(`Health check: http://localhost:${boundPort}/api/v1/health`);
  if (boundPort !== PREFERRED_PORT) {
    console.warn(
      `[api] ⚠ Port ${PREFERRED_PORT} is occupied by a stale process. Set PORT=${boundPort} and VITE_API_URL=http://localhost:${boundPort}/api/v1 in .env, then restart Vite.`,
    );
  }

  const tables = [
    `CREATE TABLE IF NOT EXISTS news_articles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      summary TEXT,
      published_at TIMESTAMPTZ NOT NULL,
      symbols TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS economic_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider_event_id TEXT UNIQUE,
      country TEXT,
      event TEXT NOT NULL,
      impact TEXT,
      actual TEXT,
      forecast TEXT,
      previous TEXT,
      event_time TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  ];
  for (const sql of tables) {
    try {
      await query(sql);
    } catch (e) {
      console.warn("[db] Table ensure:", e.message);
    }
  }
  console.log("[db] news_articles + economic_events ready");
  ensureMacroDataReady().then((r) => {
    if (r?.synced) console.log(`[macro] Economy intelligence ready (${r.synced} events synced)`);
    else if (r?.total) console.log(`[macro] Economy intelligence ready (${r.total} events in window)`);
  });
})();
