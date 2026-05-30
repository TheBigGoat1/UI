import { calculateAnalytics } from "./analytics";
import { getExchangeMeta } from "./exchanges";
import { pushNotification, pushSystemLog, systemStorage } from "./storage";

const mask = (value = "") =>
  value.length > 8 ? `${value.slice(0, 4)}...${value.slice(-4)}` : value;

const validateCredentialShape = ({ apiKey, apiSecret, passphrase }, exchangeId) => {
  if (!apiKey || apiKey.length < 8) return "API key looks too short.";
  if (!apiSecret || apiSecret.length < 8) return "API secret looks too short.";
  if (exchangeId === "okx" && (!passphrase || passphrase.length < 4)) {
    return "OKX passphrase is required.";
  }
  return null;
};

const createFakeTrade = (exchangeId, idx) => {
  const seed = exchangeId.length * (idx + 3);
  const pnl = Number((((seed % 9) - 4) * 23.5).toFixed(2));
  return {
    id: crypto.randomUUID(),
    exchange: exchangeId,
    asset: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"][idx % 4],
    type: idx % 2 === 0 ? "LONG" : "SHORT",
    strategy: idx % 3 === 0 ? "Breakout" : "Pullback",
    status: pnl >= 0 ? "WIN" : "LOSS",
    entryDate: new Date(Date.now() - idx * 3600 * 1000 * 8).toISOString(),
    pnl,
    rMultiple: Number((pnl / 50).toFixed(2)),
    size: `${(0.01 * ((idx % 4) + 1)).toFixed(2)} BTC`,
    emotion: ["Calm", "Anxious", "FOMO"][idx % 3],
    mistakes: pnl < 0 ? ["Overtraded"] : [],
    hasScreenshot: false,
  };
};

export const connectExchange = async (payload) => {
  const meta = getExchangeMeta(payload.exchangeId);
  if (!meta) {
    return { success: false, error: "Unsupported exchange." };
  }

  const inputError = validateCredentialShape(payload, payload.exchangeId);
  if (inputError) {
    pushSystemLog("Exchange validation failed", "warn", {
      exchange: payload.exchangeId,
      reason: inputError,
    });
    pushNotification("Exchange connection failed", "error", inputError);
    return { success: false, error: inputError };
  }

  const connections = systemStorage.getConnections();
  const now = new Date().toISOString();
  const sanitized = {
    id: crypto.randomUUID(),
    exchangeId: payload.exchangeId,
    exchangeName: meta.label,
    apiKeyMasked: mask(payload.apiKey),
    passphraseConfigured: Boolean(payload.passphrase),
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  const filtered = connections.filter((item) => item.exchangeId !== payload.exchangeId);
  filtered.unshift(sanitized);
  systemStorage.setConnections(filtered);

  pushSystemLog("Exchange connected", "info", { exchange: payload.exchangeId });
  pushNotification(`${meta.label} connected`, "success", "Sync engine ready.");
  return { success: true, data: sanitized };
};

export const runSync = async (exchangeId) => {
  const connections = systemStorage.getConnections();
  const connection = connections.find((item) => item.exchangeId === exchangeId);
  if (!connection || connection.status !== "active") {
    return { success: false, error: "Exchange is not connected." };
  }

  const trades = Array.from({ length: 12 }).map((_, idx) => createFakeTrade(exchangeId, idx));
  const mergedTrades = [...trades, ...systemStorage.getJournalTrades()].slice(0, 500);
  systemStorage.setJournalTrades(mergedTrades);

  const analytics = calculateAnalytics(mergedTrades);
  systemStorage.setMetrics(analytics);

  const syncRuns = systemStorage.getSyncRuns();
  syncRuns.unshift({
    id: crypto.randomUUID(),
    exchangeId,
    status: "success",
    insertedTrades: trades.length,
    createdAt: new Date().toISOString(),
  });
  systemStorage.setSyncRuns(syncRuns.slice(0, 100));

  pushSystemLog("Sync completed", "info", {
    exchange: exchangeId,
    insertedTrades: trades.length,
  });
  pushNotification("Sync completed", "success", `${connection.exchangeName} updated trades and analytics.`);
  return { success: true, data: { tradesAdded: trades.length, analytics } };
};
