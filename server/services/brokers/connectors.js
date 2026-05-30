function normalizeTrade(row, exchange) {
  return {
    symbol: String(row.symbol || "").toUpperCase(),
    side: String(row.side || "long").toLowerCase() === "short" ? "short" : "long",
    pnl: Number(row.pnl || 0),
    strategy: row.strategy || "Imported",
    emotion: row.emotion || null,
    mistakes: Array.isArray(row.mistakes) ? row.mistakes : [],
    status: row.status || (Number(row.pnl || 0) >= 0 ? "WIN" : "LOSS"),
    exchange,
    opened_at: row.opened_at || new Date().toISOString(),
  };
}

async function binanceConnector() {
  return [];
}

async function coinbaseConnector() {
  return [];
}

async function ibkrConnector() {
  return [];
}

async function mt4Connector() {
  return [];
}

async function mt5Connector() {
  return [];
}

export function parseCsvTrades(csvText, exchange = "csv") {
  const lines = String(csvText || "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const pick = (row, keys) => {
    for (const key of keys) {
      if (row[key] != null && row[key] !== "") return row[key];
    }
    return null;
  };

  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i]?.trim();
    });

    const sideRaw = String(pick(row, ["side", "type", "direction", "position"]) || "long").toLowerCase();
    const pnlRaw = pick(row, ["pnl", "profit", "pl", "p&l", "net_pnl"]);
    const dateRaw = pick(row, ["opened_at", "date", "entry_date", "close_date", "timestamp"]);

    return normalizeTrade(
      {
        symbol: pick(row, ["symbol", "asset", "pair", "ticker"]),
        side: sideRaw.includes("short") || sideRaw === "sell" ? "short" : "long",
        pnl: pnlRaw,
        strategy: pick(row, ["strategy", "setup", "notes"]),
        emotion: pick(row, ["emotion", "psychology", "mindset"]),
        status: pick(row, ["status", "result"]),
        opened_at: dateRaw,
      },
      exchange,
    );
  }).filter((trade) => trade.symbol);
}

export async function fetchBrokerTrades(exchangeId) {
  switch (exchangeId) {
    case "binance":
      return binanceConnector();
    case "coinbase":
      return coinbaseConnector();
    case "ibkr":
      return ibkrConnector();
    case "mt4":
      return mt4Connector();
    case "mt5":
      return mt5Connector();
    default:
      return [];
  }
}

export function toTradeInsert(trade, exchange) {
  return normalizeTrade(trade, exchange);
}
