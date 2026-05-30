export function openedAtDay(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function tradeFingerprint(trade) {
  const symbol = String(trade.symbol || "").toUpperCase();
  const side = String(trade.side || "long").toLowerCase();
  const pnl = Number(trade.pnl || 0).toFixed(4);
  const exchange = String(trade.exchange || "unknown").toLowerCase();
  const day = openedAtDay(trade.opened_at) || "unknown";
  return `${symbol}|${side}|${pnl}|${exchange}|${day}`;
}

export async function tradeAlreadyExists(query, userId, trade) {
  const symbol = String(trade.symbol || "").toUpperCase();
  const side = String(trade.side || "long").toLowerCase();
  const pnl = Number(trade.pnl || 0);
  const exchange = trade.exchange || null;
  const day = openedAtDay(trade.opened_at);

  if (day) {
    const { rows } = await query(
      `SELECT 1 FROM trades
       WHERE user_id = $1 AND symbol = $2 AND side = $3 AND pnl = $4
         AND COALESCE(exchange, '') = COALESCE($5, '')
         AND opened_at::date = $6::date
       LIMIT 1`,
      [userId, symbol, side, pnl, exchange, day],
    );
    return rows.length > 0;
  }

  const { rows } = await query(
    `SELECT 1 FROM trades
     WHERE user_id = $1 AND symbol = $2 AND side = $3 AND pnl = $4
       AND COALESCE(exchange, '') = COALESCE($5, '')
       AND opened_at IS NULL
     LIMIT 1`,
    [userId, symbol, side, pnl, exchange],
  );
  return rows.length > 0;
}

export async function insertTradeDeduped(query, userId, trade, batchSeen = null) {
  const normalized = {
    symbol: String(trade.symbol || "").toUpperCase(),
    side: String(trade.side || "long").toLowerCase() === "short" ? "short" : "long",
    pnl: Number(trade.pnl || 0),
    exchange: trade.exchange || null,
    strategy: trade.strategy || "Imported",
    emotion: trade.emotion || null,
    mistakes: trade.mistakes || [],
    status: trade.status || (Number(trade.pnl || 0) >= 0 ? "WIN" : "LOSS"),
    opened_at: trade.opened_at ? new Date(trade.opened_at) : new Date(),
  };

  if (!normalized.symbol) {
    return { inserted: false, reason: "missing_symbol" };
  }

  const fingerprint = tradeFingerprint(normalized);
  if (batchSeen?.has(fingerprint)) {
    return { inserted: false, reason: "duplicate_batch" };
  }

  if (await tradeAlreadyExists(query, userId, normalized)) {
    return { inserted: false, reason: "duplicate_existing" };
  }

  await query(
    `INSERT INTO trades (
       user_id, exchange, symbol, side, pnl, r_multiple, strategy, emotion, mistakes, status, opened_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      userId,
      normalized.exchange,
      normalized.symbol,
      normalized.side,
      normalized.pnl,
      normalized.pnl / 50,
      normalized.strategy,
      normalized.emotion,
      normalized.mistakes,
      normalized.status,
      normalized.opened_at,
    ],
  );

  batchSeen?.add(fingerprint);
  return { inserted: true };
}
