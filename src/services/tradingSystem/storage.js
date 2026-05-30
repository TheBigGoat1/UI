const STORAGE_PREFIX = "insidr.tradingSystem";

const KEYS = {
  connections: `${STORAGE_PREFIX}.connections`,
  syncRuns: `${STORAGE_PREFIX}.syncRuns`,
  journalTrades: `${STORAGE_PREFIX}.journalTrades`,
  metrics: `${STORAGE_PREFIX}.metrics`,
  notifications: `${STORAGE_PREFIX}.notifications`,
  logs: `${STORAGE_PREFIX}.logs`,
};

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const systemStorage = {
  getConnections: () => readJson(KEYS.connections, []),
  setConnections: (connections) => writeJson(KEYS.connections, connections),

  getSyncRuns: () => readJson(KEYS.syncRuns, []),
  setSyncRuns: (runs) => writeJson(KEYS.syncRuns, runs),

  getJournalTrades: () => readJson(KEYS.journalTrades, []),
  setJournalTrades: (trades) => writeJson(KEYS.journalTrades, trades),

  getMetrics: () =>
    readJson(KEYS.metrics, {
      winRate: 0,
      totalPnl: 0,
      tradeCount: 0,
      riskScore: 0,
      consistencyScore: 0,
      drawdown: 0,
    }),
  setMetrics: (metrics) => writeJson(KEYS.metrics, metrics),

  getNotifications: () => readJson(KEYS.notifications, []),
  setNotifications: (notifications) => writeJson(KEYS.notifications, notifications),

  getLogs: () => readJson(KEYS.logs, []),
  setLogs: (logs) => writeJson(KEYS.logs, logs),
};

export const pushSystemLog = (message, level = "info", context = {}) => {
  const logs = systemStorage.getLogs();
  logs.unshift({
    id: crypto.randomUUID(),
    message,
    level,
    context,
    createdAt: new Date().toISOString(),
  });
  systemStorage.setLogs(logs.slice(0, 300));
};

export const pushNotification = (title, kind = "info", details = "") => {
  const notifications = systemStorage.getNotifications();
  notifications.unshift({
    id: crypto.randomUUID(),
    title,
    kind,
    details,
    read: false,
    createdAt: new Date().toISOString(),
  });
  systemStorage.setNotifications(notifications.slice(0, 100));
};
