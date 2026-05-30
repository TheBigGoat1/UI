/** Canonical instruments — forex/commodities/index via Yahoo/Twelve; crypto via Binance */
export const ASSETS = [
  { asset: "EURUSD", class: "forex", yahoo: "EURUSD=X", basePrice: 1.085 },
  { asset: "GBPUSD", class: "forex", yahoo: "GBPUSD=X", basePrice: 1.265 },
  { asset: "USDJPY", class: "forex", yahoo: "USDJPY=X", basePrice: 149.2 },
  { asset: "AUDUSD", class: "forex", yahoo: "AUDUSD=X", basePrice: 0.658 },
  { asset: "USDCAD", class: "forex", yahoo: "USDCAD=X", basePrice: 1.362 },
  { asset: "USDCHF", class: "forex", yahoo: "USDCHF=X", basePrice: 0.882 },
  { asset: "NZDUSD", class: "forex", yahoo: "NZDUSD=X", basePrice: 0.612 },
  { asset: "XAUUSD", class: "commodity", yahoo: "GC=F", basePrice: 2320 },
  { asset: "XAGUSD", class: "commodity", yahoo: "SI=F", basePrice: 27.5 },
  { asset: "USOIL", class: "commodity", yahoo: "CL=F", basePrice: 78 },
  { asset: "US500", class: "index", yahoo: "^GSPC", basePrice: 5200 },
  { asset: "US30", class: "index", yahoo: "^DJI", basePrice: 39000 },
  { asset: "NAS100", class: "index", yahoo: "^NDX", basePrice: 18500 },
  // Crypto — Binance USDT pairs (live spot)
  { asset: "BTCUSD", class: "crypto", binance: "BTCUSDT", yahoo: "BTC-USD", basePrice: 67000 },
  { asset: "ETHUSD", class: "crypto", binance: "ETHUSDT", yahoo: "ETH-USD", basePrice: 3500 },
  { asset: "BNBUSD", class: "crypto", binance: "BNBUSDT", yahoo: "BNB-USD", basePrice: 580 },
  { asset: "SOLUSD", class: "crypto", binance: "SOLUSDT", yahoo: "SOL-USD", basePrice: 145 },
  { asset: "XRPUSD", class: "crypto", binance: "XRPUSDT", yahoo: "XRP-USD", basePrice: 0.62 },
  { asset: "ADAUSD", class: "crypto", binance: "ADAUSDT", yahoo: "ADA-USD", basePrice: 0.45 },
  { asset: "DOGEUSD", class: "crypto", binance: "DOGEUSDT", yahoo: "DOGE-USD", basePrice: 0.12 },
  { asset: "AVAXUSD", class: "crypto", binance: "AVAXUSDT", yahoo: "AVAX-USD", basePrice: 35 },
  { asset: "LINKUSD", class: "crypto", binance: "LINKUSDT", yahoo: "LINK-USD", basePrice: 14 },
  { asset: "DOTUSD", class: "crypto", binance: "DOTUSDT", yahoo: "DOT-USD", basePrice: 7 },
  { asset: "LTCUSD", class: "crypto", binance: "LTCUSDT", yahoo: "LTC-USD", basePrice: 85 },
  { asset: "ATOMUSD", class: "crypto", binance: "ATOMUSDT", yahoo: "ATOM-USD", basePrice: 8 },
];

export const ASSET_PROFILES = {
  EURUSD: {
    typical_behaviour:
      "Mean-reverts in Asian sessions; trends during London/NY overlap when USD data hits.",
    key_drivers: { countries: ["US", "EU", "DE"] },
    correlations: { positive: ["GBPUSD", "AUDUSD"], negative: ["USDCHF", "USDJPY"] },
  },
  GBPUSD: {
    typical_behaviour: "Volatile around BoE; sensitive to UK inflation surprises.",
    key_drivers: { countries: ["UK", "US", "EU"] },
    correlations: { positive: ["EURUSD"], negative: ["USDCHF"] },
  },
  USDJPY: {
    typical_behaviour: "Carry-sensitive; sharp moves on BoJ/Fed divergence.",
    key_drivers: { countries: ["US", "JP"] },
    correlations: { positive: ["USDCHF"], negative: ["AUDUSD", "XAUUSD"] },
  },
  XAUUSD: {
    typical_behaviour: "Safe-haven bid on risk-off; inversely correlated to real yields.",
    key_drivers: { countries: ["US", "CN"] },
    correlations: { positive: ["XAGUSD"], negative: ["USDJPY", "US500"] },
  },
  BTCUSD: {
    typical_behaviour: "Leads crypto beta; liquidity sweeps on funding rate extremes.",
    key_drivers: { countries: ["US", "Global"] },
    correlations: { positive: ["ETHUSD", "SOLUSD"], negative: ["USDJPY"] },
  },
  ETHUSD: {
    typical_behaviour: "Tracks BTC with higher beta; sensitive to L2 activity and ETF flows.",
    key_drivers: { countries: ["US", "Global"] },
    correlations: { positive: ["BTCUSD", "SOLUSD"], negative: [] },
  },
  SOLUSD: {
    typical_behaviour: "High-vol alt; strong intraday trends on Binance spot volume.",
    key_drivers: { countries: ["Global"] },
    correlations: { positive: ["ETHUSD", "BTCUSD"], negative: [] },
  },
  BNBUSD: {
    typical_behaviour: "Exchange-token dynamics; often holds bid in risk-on crypto sessions.",
    key_drivers: { countries: ["Global"] },
    correlations: { positive: ["BTCUSD"], negative: [] },
  },
};

export function getAssetMeta(symbol) {
  const key = String(symbol || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return ASSETS.find((a) => a.asset === key) || null;
}

export function getAssetClass(symbol) {
  return getAssetMeta(symbol)?.class || "forex";
}

export function getSymbolsByClass(assetClass) {
  if (!assetClass || assetClass === "all") {
    return ASSETS.map((a) => a.asset);
  }
  return ASSETS.filter((a) => a.class === assetClass).map((a) => a.asset);
}

export function getAssetProfile(symbol) {
  const key = String(symbol || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return (
    ASSET_PROFILES[key] || {
      typical_behaviour: `${key} follows macro liquidity and session volatility patterns.`,
      key_drivers: { countries: ["US", "Global"] },
      correlations: { positive: [], negative: [] },
    }
  );
}
