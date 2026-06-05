/**
 * Per-symbol news search queries — asset class and market-specific terms.
 */
import { getAssetMeta, getAssetClass } from "../config/assets.js";

const SYMBOL_QUERIES = {
  XAUUSD: "gold price OR XAU OR federal reserve OR inflation OR safe haven",
  XAGUSD: "silver price OR XAG OR precious metals",
  USOIL: "crude oil WTI OR OPEC OR petroleum OR energy prices",
  BZUSD: "Brent crude oil OR UK oil OR energy",
  NATGAS: "natural gas prices OR LNG OR energy",
  COPPER: "copper prices OR industrial metals OR China demand",
  US500: "S&P 500 OR stock market OR Wall Street OR equities",
  US30: "Dow Jones OR blue chip stocks OR US equities",
  NAS100: "Nasdaq OR tech stocks OR NVIDIA OR Apple stock",
  GER40: "DAX OR German stocks OR European equities",
  UK100: "FTSE 100 OR UK stocks OR Bank of England",
  JP225: "Nikkei OR Japan stocks OR Bank of Japan",
  HK50: "Hang Seng OR Hong Kong stocks OR China markets",
  AUS200: "ASX OR Australian stocks OR RBA",
  FRA40: "CAC 40 OR French stocks OR European markets",
  EU50: "Euro Stoxx OR European stocks",
  US2000: "Russell 2000 OR small cap stocks",
  DXY: "US dollar index OR DXY OR dollar strength",
  VIX: "VIX volatility OR market fear OR options",
  BTCUSD: "Bitcoin OR BTC cryptocurrency OR crypto markets",
  ETHUSD: "Ethereum OR ETH cryptocurrency",
};

export function buildAssetNewsQuery(asset) {
  const sym = String(asset || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!sym) return "financial markets OR forex OR stocks";

  if (SYMBOL_QUERIES[sym]) return SYMBOL_QUERIES[sym];

  const meta = getAssetMeta(sym);
  const cls = meta?.class || getAssetClass(sym);
  const base = sym.replace(/USDT|USD/gi, "");

  if (cls === "crypto") {
    return `${base} cryptocurrency OR crypto markets OR ${base} price`;
  }

  if (cls === "forex" && sym.length === 6) {
    const b = sym.slice(0, 3);
    const q = sym.slice(3);
    return `${b} ${q} forex OR ${b}/${q} OR central bank OR ${b} currency`;
  }

  if (cls === "commodity") {
    return `${base} commodity OR futures OR ${sym} price`;
  }

  if (cls === "index") {
    return `${sym} stock index OR equities OR market rally OR selloff`;
  }

  return `${base} markets OR ${sym} trading`;
}

export function cryptopanicCurrency(asset) {
  const sym = String(asset || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const cls = getAssetClass(sym);
  if (cls !== "crypto") return "";
  return sym.replace(/USDT|USD/gi, "");
}
