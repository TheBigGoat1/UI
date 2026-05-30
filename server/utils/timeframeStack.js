/** Map chart interval → higher timeframe for structure comparison */

const HTF_STACK = {
  "1m": { interval: "15m", period: "1W" },
  "5m": { interval: "1h", period: "1W" },
  "15m": { interval: "4h", period: "1M" },
  "1h": { interval: "4h", period: "1M" },
  "4h": { interval: "1day", period: "3M" },
  "1day": { interval: "1week", period: "1Y" },
  "1week": { interval: "1day", period: "1Y" },
};

export function normalizeInterval(interval) {
  const key = String(interval || "4h").toLowerCase();
  if (key === "1d") return "1day";
  if (key === "1w") return "1week";
  return key;
}

export function normalizePeriod(period) {
  const key = String(period || "1M").toUpperCase();
  return ["1D", "1W", "1M", "3M", "1Y"].includes(key) ? key : "1M";
}

export function resolveTimeframeStack(chartInterval = "4h", chartPeriod = "1M") {
  const interval = normalizeInterval(chartInterval);
  const period = normalizePeriod(chartPeriod);
  const htf = HTF_STACK[interval] || { interval: "1day", period: "3M" };

  let htfPeriod = htf.period;
  if (period === "1Y" && interval !== "1week") htfPeriod = "1Y";
  else if (period === "3M" && ["4h", "1day"].includes(interval)) htfPeriod = "3M";
  else if (period === "1D") htfPeriod = "1W";

  return {
    chart: { interval, period },
    htf: { interval: htf.interval, period: htfPeriod },
  };
}

export function formatTfLabel(interval) {
  const map = {
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "1h": "1H",
    "4h": "4H",
    "1day": "1D",
    "1week": "1W",
  };
  return map[normalizeInterval(interval)] || interval;
}
