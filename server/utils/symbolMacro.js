import { getAssetProfile, getAssetClass } from "../config/assets.js";

/** Currencies / countries used for macro event gates */
export function macroScopeForSymbol(symbol) {
  const key = String(symbol || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const profile = getAssetProfile(key);
  const countries = profile?.key_drivers?.countries || ["US", "Global"];
  const currencies = new Set();

  if (countries.includes("US") || countries.includes("Global")) currencies.add("USD");
  if (countries.includes("EU") || countries.includes("DE")) currencies.add("EUR");
  if (countries.includes("UK")) currencies.add("GBP");
  if (countries.includes("JP")) currencies.add("JPY");
  if (countries.includes("AU")) currencies.add("AUD");
  if (countries.includes("CA")) currencies.add("CAD");
  if (countries.includes("CH")) currencies.add("CHF");
  if (countries.includes("NZ")) currencies.add("NZD");
  if (countries.includes("CN")) currencies.add("CNY");

  if (key.startsWith("EUR")) currencies.add("EUR");
  if (key.startsWith("GBP")) currencies.add("GBP");
  if (key.startsWith("USD") && key.includes("JPY")) {
    currencies.add("USD");
    currencies.add("JPY");
  }
  if (key.includes("XAU") || key.includes("XAG")) currencies.add("USD");
  if (getAssetClass(key) === "crypto") {
    currencies.add("USD");
    countries.push("US");
  }

  return {
    symbol: key,
    countries: [...new Set(countries)],
    currencies: [...currencies],
    bucket: getAssetClass(key) === "crypto" ? "crypto_beta" : getAssetClass(key),
  };
}
