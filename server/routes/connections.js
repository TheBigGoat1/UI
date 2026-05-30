import { Router } from "express";
import { query } from "../db.js";
import { resolveUser } from "../middleware/user.js";
import {
  fetchBrokerTrades,
  parseCsvTrades,
  toTradeInsert,
} from "../services/brokers/connectors.js";

const router = Router();
router.use(resolveUser);

const mask = (value = "") =>
  value.length > 8 ? `${value.slice(0, 4)}...${value.slice(-4)}` : value;

router.get("/", async (req, res) => {
  const { rows } = await query(
    `SELECT id, exchange, api_key_masked, passphrase_configured, is_active, created_at, updated_at
     FROM exchange_connections
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [req.user.id],
  );

  res.json({
    success: true,
    data: rows.map((row) => ({
      id: row.id,
      exchangeId: row.exchange,
      exchangeName: row.exchange.charAt(0).toUpperCase() + row.exchange.slice(1),
      apiKeyMasked: row.api_key_masked,
      status: row.is_active ? "active" : "inactive",
      createdAt: row.created_at,
    })),
  });
});

router.post("/", async (req, res) => {
  const { exchangeId, apiKey, passphrase } = req.body;
  const allowed = ["binance", "bybit", "okx", "coinbase", "ibkr", "mt4", "mt5"];

  if (!allowed.includes(exchangeId)) {
    return res.status(400).json({ success: false, error: "Unsupported exchange." });
  }
  if (!apiKey || apiKey.length < 8) {
    return res.status(400).json({ success: false, error: "API key looks too short." });
  }

  const { rows } = await query(
    `INSERT INTO exchange_connections (
       user_id, exchange, api_key_masked, passphrase_configured, is_active
     ) VALUES ($1,$2,$3,$4,true)
     ON CONFLICT (user_id, exchange)
     DO UPDATE SET
       api_key_masked = EXCLUDED.api_key_masked,
       passphrase_configured = EXCLUDED.passphrase_configured,
       is_active = true,
       updated_at = NOW()
     RETURNING *`,
    [req.user.id, exchangeId, mask(apiKey), Boolean(passphrase)],
  );

  await query(
    `INSERT INTO notifications (user_id, type, title, body)
     VALUES ($1, 'success', $2, $3)`,
    [req.user.id, `${exchangeId} connected`, "Sync engine ready."],
  );

  await query(
    `INSERT INTO system_logs (user_id, level, message, context)
     VALUES ($1, 'info', 'Exchange connected', $2::jsonb)`,
    [req.user.id, JSON.stringify({ exchange: exchangeId })],
  );

  res.json({ success: true, data: rows[0] });
});

router.post("/:exchangeId/sync", async (req, res) => {
  const { exchangeId } = req.params;
  const userId = req.user.id;

  const connection = (
    await query(
      `SELECT * FROM exchange_connections WHERE user_id = $1 AND exchange = $2 AND is_active = true`,
      [userId, exchangeId],
    )
  ).rows[0];

  if (!connection) {
    return res.status(404).json({ success: false, error: "Exchange is not connected." });
  }

  const importedTrades =
    exchangeId === "csv"
      ? parseCsvTrades(req.body?.csv || "", "csv")
      : await fetchBrokerTrades(exchangeId);

  for (const rawTrade of importedTrades) {
    const trade = toTradeInsert(rawTrade, exchangeId);
    await query(
      `INSERT INTO trades (
         user_id, exchange, symbol, side, pnl, r_multiple, strategy, emotion, mistakes, status, opened_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())`,
      [userId, exchangeId, trade.symbol, trade.side, trade.pnl, trade.pnl / 50, trade.strategy, trade.emotion, trade.mistakes, trade.status, trade.opened_at],
    );
  }

  await query(
    `INSERT INTO sync_runs (user_id, exchange, status, inserted_trades, completed_at)
     VALUES ($1,$2,'success',$3,NOW())`,
    [userId, exchangeId, importedTrades.length],
  );

  await query(
    `INSERT INTO notifications (user_id, type, title, body)
     VALUES ($1, 'success', 'Sync completed', $2)`,
    [userId, `${exchangeId} synced ${importedTrades.length} trades`],
  );

  res.json({
    success: true,
    data: {
      tradesAdded: importedTrades.length,
      source: exchangeId,
      note:
        importedTrades.length === 0
          ? "No new trades found from connector. Verify API scopes or import CSV."
          : undefined,
    },
  });
});

export default router;
