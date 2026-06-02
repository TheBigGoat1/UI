/** Canonical instruments — forex/commodities/index via Yahoo/Twelve; crypto via Binance */
export const ASSETS = [
  { asset: "EURUSD", class: "forex", yahoo: "EURUSD=X", basePrice: 1.085 },
  { asset: "GBPUSD", class: "forex", yahoo: "GBPUSD=X", basePrice: 1.265 },
  { asset: "USDJPY", class: "forex", yahoo: "USDJPY=X", basePrice: 149.2 },
  { asset: "AUDUSD", class: "forex", yahoo: "AUDUSD=X", basePrice: 0.658 },
  { asset: "USDCAD", class: "forex", yahoo: "USDCAD=X", basePrice: 1.362 },
  { asset: "USDCHF", class: "forex", yahoo: "USDCHF=X", basePrice: 0.882 },
  { asset: "NZDUSD", class: "forex", yahoo: "NZDUSD=X", basePrice: 0.612 },
  { asset: "EURJPY", class: "forex", yahoo: "EURJPY=X", basePrice: 162.5 },
  { asset: "GBPJPY", class: "forex", yahoo: "GBPJPY=X", basePrice: 189.2 },
  { asset: "EURGBP", class: "forex", yahoo: "EURGBP=X", basePrice: 0.857 },
  { asset: "EURCHF", class: "forex", yahoo: "EURCHF=X", basePrice: 0.963 },
  { asset: "GBPCHF", class: "forex", yahoo: "GBPCHF=X", basePrice: 1.116 },
  { asset: "AUDJPY", class: "forex", yahoo: "AUDJPY=X", basePrice: 98.3 },
  { asset: "CADJPY", class: "forex", yahoo: "CADJPY=X", basePrice: 109.4 },
  { asset: "CHFJPY", class: "forex", yahoo: "CHFJPY=X", basePrice: 169.1 },
  { asset: "NZDJPY", class: "forex", yahoo: "NZDJPY=X", basePrice: 91.5 },
  { asset: "AUDCAD", class: "forex", yahoo: "AUDCAD=X", basePrice: 0.894 },
  { asset: "AUDNZD", class: "forex", yahoo: "AUDNZD=X", basePrice: 1.074 },
  { asset: "AUDCHF", class: "forex", yahoo: "AUDCHF=X", basePrice: 0.579 },
  { asset: "NZDCAD", class: "forex", yahoo: "NZDCAD=X", basePrice: 0.832 },
  { asset: "NZDCHF", class: "forex", yahoo: "NZDCHF=X", basePrice: 0.541 },
  { asset: "EURAUD", class: "forex", yahoo: "EURAUD=X", basePrice: 1.65 },
  { asset: "EURCAD", class: "forex", yahoo: "EURCAD=X", basePrice: 1.477 },
  { asset: "EURNZD", class: "forex", yahoo: "EURNZD=X", basePrice: 1.749 },
  { asset: "GBPAUD", class: "forex", yahoo: "GBPAUD=X", basePrice: 1.93 },
  { asset: "GBPCAD", class: "forex", yahoo: "GBPCAD=X", basePrice: 1.72 },
  { asset: "GBPNZD", class: "forex", yahoo: "GBPNZD=X", basePrice: 2.03 },
  { asset: "USDNOK", class: "forex", yahoo: "NOK=X", basePrice: 10.8 },
  { asset: "USDSEK", class: "forex", yahoo: "SEK=X", basePrice: 10.6 },
  { asset: "XAUUSD", class: "commodity", yahoo: "XAUUSD=X", basePrice: 2320 },
  { asset: "XAGUSD", class: "commodity", yahoo: "XAGUSD=X", basePrice: 27.5 },
  { asset: "USOIL", class: "commodity", yahoo: "CL=F", basePrice: 78 },
  { asset: "BZUSD", class: "commodity", yahoo: "BZ=F", basePrice: 82 },
  { asset: "NATGAS", class: "commodity", yahoo: "NG=F", basePrice: 2.7 },
  { asset: "COPPER", class: "commodity", yahoo: "HG=F", basePrice: 4.5 },
  { asset: "US500", class: "index", yahoo: "^GSPC", basePrice: 5200 },
  { asset: "US30", class: "index", yahoo: "^DJI", basePrice: 39000 },
  { asset: "NAS100", class: "index", yahoo: "^NDX", basePrice: 18500 },
  { asset: "GER40", class: "index", yahoo: "^GDAXI", basePrice: 18800 },
  { asset: "UK100", class: "index", yahoo: "^FTSE", basePrice: 8300 },
  { asset: "JP225", class: "index", yahoo: "^N225", basePrice: 38800 },
  { asset: "HK50", class: "index", yahoo: "^HSI", basePrice: 18400 },
  { asset: "DXY", class: "index", yahoo: "DX-Y=F", basePrice: 104 },
  { asset: "VIX", class: "index", yahoo: "^VIX", basePrice: 14 },
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
  { asset: "TRXUSD", class: "crypto", binance: "TRXUSDT", yahoo: "TRX-USD", basePrice: 0.12 },
  { asset: "BCHUSD", class: "crypto", binance: "BCHUSDT", yahoo: "BCH-USD", basePrice: 470 },
  { asset: "ETCUSD", class: "crypto", binance: "ETCUSDT", yahoo: "ETC-USD", basePrice: 31 },
  { asset: "NEARUSD", class: "crypto", binance: "NEARUSDT", yahoo: "NEAR-USD", basePrice: 7.2 },
  { asset: "APTUSD", class: "crypto", binance: "APTUSDT", yahoo: "APT-USD", basePrice: 9.5 },
  { asset: "ARBUSD", class: "crypto", binance: "ARBUSDT", yahoo: "ARB-USD", basePrice: 1.3 },
  { asset: "OPUSD", class: "crypto", binance: "OPUSDT", yahoo: "OP-USD", basePrice: 2.6 },
  { asset: "SUIUSD", class: "crypto", binance: "SUIUSDT", yahoo: "SUI-USD", basePrice: 1.15 },
  { asset: "UNIUSD", class: "crypto", binance: "UNIUSDT", yahoo: "UNI-USD", basePrice: 10.5 },
  { asset: "FILUSD", class: "crypto", binance: "FILUSDT", yahoo: "FIL-USD", basePrice: 8.2 },
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
