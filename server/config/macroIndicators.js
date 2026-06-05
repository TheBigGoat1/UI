/** Grouped macro indicators per country — Yahoo symbols for live sparklines */

export const MACRO_COUNTRY_LABELS = {
  US: "United States",
  EU: "Eurozone",
  GB: "United Kingdom",
  JP: "Japan",
  AU: "Australia",
  CA: "Canada",
  CH: "Switzerland",
  NZ: "New Zealand",
  CN: "China",
};

export const MACRO_INDICATOR_CATALOG = {
  US: [
    {
      group: "Rates & Money",
      items: [
        { id: "fed-funds", name: "Fed Funds Target", yahoo: "^IRX", unit: "%", decimals: 2 },
      ],
    },
    {
      group: "Inflation",
      items: [
        { id: "cpi-yoy", name: "CPI YoY", yahoo: "TIP", unit: "%", decimals: 2, note: "TIP ETF trend proxy" },
        { id: "core-pce", name: "Core PCE YoY", yahoo: "^TNX", unit: "%", decimals: 2, note: "Yield curve context" },
        { id: "ppi", name: "PPI Final Demand YoY", yahoo: "XLB", unit: "%", decimals: 2, note: "Materials sector proxy" },
      ],
    },
    {
      group: "Employment",
      items: [
        { id: "unemployment", name: "Unemployment Rate", yahoo: "IWM", unit: "%", decimals: 2, note: "Small-cap labor beta" },
        { id: "nfp", name: "Nonfarm Payrolls", yahoo: "SPY", unit: "K", decimals: 1, note: "Equity labor beta" },
        { id: "avg-earnings", name: "Average Earnings YoY", yahoo: "XLY", unit: "%", decimals: 2 },
        { id: "jobless", name: "Initial Jobless Claims", yahoo: "HYG", unit: "K", decimals: 1 },
        { id: "jolts", name: "JOLTs Job Openings", yahoo: "XLF", unit: "M", decimals: 2 },
      ],
    },
    {
      group: "Growth",
      items: [
        { id: "gdp-final", name: "GDP Final QoQ", yahoo: "DIA", unit: "%", decimals: 2 },
        { id: "gdp-advance", name: "GDP Advance QoQ", yahoo: "QQQ", unit: "%", decimals: 2 },
        { id: "retail", name: "Retail Sales MoM", yahoo: "XRT", unit: "%", decimals: 2 },
        { id: "ind-prod", name: "Industrial Production MoM", yahoo: "XLI", unit: "%", decimals: 2 },
      ],
    },
    {
      group: "PMIs",
      items: [
        { id: "ism-mfg", name: "ISM Manufacturing PMI", yahoo: "XLI", unit: "", decimals: 2 },
        { id: "ism-svc", name: "ISM Services PMI", yahoo: "XLF", unit: "", decimals: 2 },
        { id: "philly", name: "Philly Fed Index", yahoo: "SPY", unit: "", decimals: 2 },
        { id: "richmond", name: "Richmond Fed Index", yahoo: "IWM", unit: "", decimals: 2 },
        { id: "michigan", name: "Michigan Sentiment", yahoo: "XLY", unit: "", decimals: 2 },
      ],
    },
  ],
  EU: [
    {
      group: "Rates & Money",
      items: [{ id: "ecb-rate", name: "ECB Deposit Rate", yahoo: "FXE", unit: "%", decimals: 2 }],
    },
    {
      group: "Inflation",
      items: [
        { id: "eu-cpi", name: "CPI YoY", yahoo: "FXE", unit: "%", decimals: 2 },
        { id: "eu-core", name: "Core CPI YoY", yahoo: "VGK", unit: "%", decimals: 2 },
      ],
    },
    {
      group: "Growth",
      items: [
        { id: "eu-gdp", name: "GDP QoQ", yahoo: "EWG", unit: "%", decimals: 2 },
        { id: "eu-retail", name: "Retail Sales MoM", yahoo: "FEZ", unit: "%", decimals: 2 },
      ],
    },
  ],
  GB: [
    {
      group: "Rates & Money",
      items: [{ id: "boe-rate", name: "BoE Bank Rate", yahoo: "FXB", unit: "%", decimals: 2 }],
    },
    {
      group: "Inflation",
      items: [{ id: "uk-cpi", name: "CPI YoY", yahoo: "EWU", unit: "%", decimals: 2 }],
    },
    {
      group: "Employment",
      items: [{ id: "uk-unemp", name: "Unemployment Rate", yahoo: "FXB", unit: "%", decimals: 2 }],
    },
  ],
  JP: [
    {
      group: "Rates & Money",
      items: [{ id: "boj-rate", name: "BoJ Policy Rate", yahoo: "FXY", unit: "%", decimals: 2 }],
    },
    {
      group: "Inflation",
      items: [{ id: "jp-cpi", name: "CPI YoY", yahoo: "EWJ", unit: "%", decimals: 2 }],
    },
    {
      group: "Growth",
      items: [{ id: "jp-gdp", name: "GDP QoQ", yahoo: "DXJ", unit: "%", decimals: 2 }],
    },
  ],
};

export function getIndicatorCatalog(country) {
  const key = String(country || "US").toUpperCase();
  return MACRO_INDICATOR_CATALOG[key] || MACRO_INDICATOR_CATALOG.US;
}
