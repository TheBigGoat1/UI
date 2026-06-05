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
  { asset: "USDNOK", class: "forex", yahoo: "USDNOK=X", basePrice: 10.8 },
  { asset: "USDSEK", class: "forex", yahoo: "SEK=X", basePrice: 10.6 },
  { asset: "USDCNH", class: "forex", yahoo: "USDCNH=X", basePrice: 7.25 },
  { asset: "USDMXN", class: "forex", yahoo: "USDMXN=X", basePrice: 17.2 },
  { asset: "USDZAR", class: "forex", yahoo: "USDZAR=X", basePrice: 18.5 },
  { asset: "USDTRY", class: "forex", yahoo: "USDTRY=X", basePrice: 32.5 },
  { asset: "USDSGD", class: "forex", yahoo: "USDSGD=X", basePrice: 1.34 },
  { asset: "USDHKD", class: "forex", yahoo: "USDHKD=X", basePrice: 7.82 },
  { asset: "EURSEK", class: "forex", yahoo: "EURSEK=X", basePrice: 11.5 },
  { asset: "EURNOK", class: "forex", yahoo: "EURNOK=X", basePrice: 11.7 },
  { asset: "EURPLN", class: "forex", yahoo: "EURPLN=X", basePrice: 4.32 },
  { asset: "EURHUF", class: "forex", yahoo: "EURHUF=X", basePrice: 395 },
  { asset: "EURTRY", class: "forex", yahoo: "EURTRY=X", basePrice: 35.2 },
  { asset: "GBPSEK", class: "forex", yahoo: "GBPSEK=X", basePrice: 13.4 },
  { asset: "GBPNOK", class: "forex", yahoo: "GBPNOK=X", basePrice: 13.6 },
  { asset: "XAUUSD", class: "commodity", yahoo: "XAUUSD=X", basePrice: 2320, tv: "FOREXCOM:XAUUSD" },
  { asset: "XAGUSD", class: "commodity", yahoo: "XAGUSD=X", basePrice: 27.5, tv: "FOREXCOM:XAGUSD" },
  { asset: "USOIL", class: "commodity", yahoo: "CL=F", basePrice: 78, tv: "TVC:USOIL" },
  { asset: "BZUSD", class: "commodity", yahoo: "BZ=F", basePrice: 82, tv: "TVC:UKOIL" },
  { asset: "NATGAS", class: "commodity", yahoo: "NG=F", basePrice: 2.7, tv: "TVC:NATGAS" },
  { asset: "COPPER", class: "commodity", yahoo: "HG=F", basePrice: 4.5, tv: "COMEX:HG1!" },
  { asset: "US500", class: "index", yahoo: "^GSPC", basePrice: 5200, tv: "SP:SPX" },
  { asset: "US30", class: "index", yahoo: "^DJI", basePrice: 39000, tv: "DJ:DJI" },
  { asset: "NAS100", class: "index", yahoo: "^NDX", basePrice: 18500, tv: "NASDAQ:NDX" },
  { asset: "GER40", class: "index", yahoo: "^GDAXI", basePrice: 18800, tv: "XETR:DAX" },
  { asset: "UK100", class: "index", yahoo: "^FTSE", basePrice: 8300, tv: "TVC:UKX" },
  { asset: "JP225", class: "index", yahoo: "^N225", basePrice: 38800, tv: "TVC:NI225" },
  { asset: "HK50", class: "index", yahoo: "^HSI", basePrice: 18400, tv: "HSI:HSI" },
  { asset: "AUS200", class: "index", yahoo: "^AXJO", basePrice: 7800, tv: "ASX:XJO" },
  { asset: "FRA40", class: "index", yahoo: "^FCHI", basePrice: 7800, tv: "TVC:CAC40" },
  { asset: "EU50", class: "index", yahoo: "^STOXX50E", basePrice: 4900, tv: "TVC:SX5E" },
  { asset: "US2000", class: "index", yahoo: "^RUT", basePrice: 2100, tv: "TVC:RUT" },
  { asset: "DXY", class: "index", yahoo: "DX-Y=F", basePrice: 104, tv: "TVC:DXY" },
  { asset: "VIX", class: "index", yahoo: "^VIX", basePrice: 14, tv: "CBOE:VIX" },
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
  { asset: "POLUSD", class: "crypto", binance: "POLUSDT", yahoo: "MATIC-USD", basePrice: 0.55 },
  { asset: "SHIBUSD", class: "crypto", binance: "SHIBUSDT", yahoo: "SHIB-USD", basePrice: 0.00002 },
  { asset: "INJUSD", class: "crypto", binance: "INJUSDT", yahoo: "INJ-USD", basePrice: 24 },
  { asset: "TIAUSD", class: "crypto", binance: "TIAUSDT", yahoo: "TIA-USD", basePrice: 6.5 },
  { asset: "PEPEUSD", class: "crypto", binance: "PEPEUSDT", yahoo: "PEPE-USD", basePrice: 0.00001 },
  { asset: "WIFUSD", class: "crypto", binance: "WIFUSDT", yahoo: "WIF-USD", basePrice: 2.8 },
  { asset: "ICPUSD", class: "crypto", binance: "ICPUSDT", yahoo: "ICP-USD", basePrice: 12 },
  { asset: "HBARUSD", class: "crypto", binance: "HBARUSDT", yahoo: "HBAR-USD", basePrice: 0.08 },
  { asset: "XLMUSD", class: "crypto", binance: "XLMUSDT", yahoo: "XLM-USD", basePrice: 0.11 },
  { asset: "VETUSD", class: "crypto", binance: "VETUSDT", yahoo: "VET-USD", basePrice: 0.03 },
  { asset: "ALGOUSD", class: "crypto", binance: "ALGOUSDT", yahoo: "ALGO-USD", basePrice: 0.18 },
  { asset: "AAVEUSD", class: "crypto", binance: "AAVEUSDT", yahoo: "AAVE-USD", basePrice: 95 },
  { asset: "MKRUSD", class: "crypto", binance: "MKRUSDT", yahoo: "MKR-USD", basePrice: 1800 },
  { asset: "SEIUSD", class: "crypto", binance: "SEIUSDT", yahoo: "SEI-USD", basePrice: 0.45 },
  { asset: "FETUSD", class: "crypto", binance: "FETUSDT", yahoo: "FET-USD", basePrice: 1.6 },
  { asset: "RENDERUSD", class: "crypto", binance: "RENDERUSDT", yahoo: "RNDR-USD", basePrice: 7.5 },
  { asset: "CRVUSD", class: "crypto", binance: "CRVUSDT", yahoo: "CRV-USD", basePrice: 0.45 },
  { asset: "SNXUSD", class: "crypto", binance: "SNXUSDT", yahoo: "SNX-USD", basePrice: 2.5 },
  { asset: "TONUSD", class: "crypto", binance: "TONUSDT", yahoo: "TON-USD", basePrice: 5.8 },
  { asset: "PENDLEUSD", class: "crypto", binance: "PENDLEUSDT", yahoo: "PENDLE-USD", basePrice: 4.2 },
  { asset: "STXUSD", class: "crypto", binance: "STXUSDT", yahoo: "STX-USD", basePrice: 1.8 },
  { asset: "RUNEUSD", class: "crypto", binance: "RUNEUSDT", yahoo: "RUNE-USD", basePrice: 5.5 },
  { asset: "IMXUSD", class: "crypto", binance: "IMXUSDT", yahoo: "IMX-USD", basePrice: 1.5 },
  { asset: "GRTUSD", class: "crypto", binance: "GRTUSDT", yahoo: "GRT-USD", basePrice: 0.2 },
  { asset: "SANDUSD", class: "crypto", binance: "SANDUSDT", yahoo: "SAND-USD", basePrice: 0.35 },
  { asset: "MANAUSD", class: "crypto", binance: "MANAUSDT", yahoo: "MANA-USD", basePrice: 0.4 },
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

const FX_CURRENCIES = new Set([
  "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD",
  "NOK", "SEK", "SGD", "HKD", "CNH", "MXN", "ZAR", "TRY", "PLN", "HUF", "DKK", "CZK",
]);

/** TradingView scanner/chart symbol — single source for chart + live quotes. */
export function getTradingViewTicker(symbolOrMeta) {
  const meta =
    typeof symbolOrMeta === "string" ? getAssetMeta(symbolOrMeta) : symbolOrMeta;
  if (!meta?.asset) return null;
  if (meta.tv) return meta.tv;
  if (meta.binance) return `BINANCE:${meta.binance}`;
  const key = meta.asset;
  if (key.length === 6) {
    const base = key.slice(0, 3);
    const quote = key.slice(3, 6);
    if (FX_CURRENCIES.has(base) && FX_CURRENCIES.has(quote)) return `FX:${key}`;
  }
  return null;
}
