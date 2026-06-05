import { getIndicatorCatalog, MACRO_COUNTRY_LABELS } from "../config/macroIndicators.js";
import { fetchYahooHistorySeries } from "./marketData.js";
import { cached } from "./cache.js";

function formatValue(value, item) {
  if (!Number.isFinite(value)) return "n/a";
  const d = item.decimals ?? 2;
  if (item.unit === "K") return `${(value / 1000).toFixed(1)}K`;
  if (item.unit === "M") return `${(value / 1_000_000).toFixed(2)}M`;
  if (item.unit === "%") return `${value.toFixed(d)}%`;
  return value.toFixed(d);
}

async function loadIndicator(item) {
  try {
    const bars = await fetchYahooHistorySeries(item.yahoo, "1day", "2y");
    if (!bars?.length) {
      return {
        id: item.id,
        name: item.name,
        value: null,
        changePercent: null,
        period: null,
        sparkline: [],
        note: item.note || null,
      };
    }
    const tail = bars.slice(-36);
    const last = tail[tail.length - 1];
    const prev = tail.length > 1 ? tail[tail.length - 2] : last;
    const value = Number(last.close);
    const prevVal = Number(prev.close);
    const changePercent =
      Number.isFinite(value) && Number.isFinite(prevVal) && prevVal !== 0
        ? ((value - prevVal) / prevVal) * 100
        : 0;
    const d = last.time ? new Date(last.time * 1000) : new Date();
    const period = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

    return {
      id: item.id,
      name: item.name,
      value,
      valueLabel: formatValue(value, item),
      changePercent,
      period,
      sparkline: tail.map((b) => ({
        time: b.time,
        value: Number(b.close),
      })),
      note: item.note || null,
    };
  } catch {
    return {
      id: item.id,
      name: item.name,
      value: null,
      valueLabel: "n/a",
      changePercent: null,
      period: null,
      sparkline: [],
      note: item.note || null,
    };
  }
}

export async function getMacroIndicatorsForCountry(country) {
  const key = String(country || "US").toUpperCase();
  const cacheKey = `macro:indicators:${key}`;

  return cached(cacheKey, 120_000, async () => {
    const catalog = getIndicatorCatalog(key);
    const groups = await Promise.all(
      catalog.map(async (g) => ({
        group: g.group,
        count: g.items.length,
        items: await Promise.all(g.items.map(loadIndicator)),
      })),
    );

    return {
      country: key,
      label: MACRO_COUNTRY_LABELS[key] || key,
      groups,
      indicatorCount: groups.reduce((n, g) => n + g.items.length, 0),
      asOf: new Date().toISOString(),
    };
  });
}

export function listMacroCountries() {
  return Object.entries(MACRO_COUNTRY_LABELS).map(([code, label]) => ({ code, label }));
}
