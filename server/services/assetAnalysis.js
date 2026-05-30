import { getAssetMeta, getAssetProfile } from "../config/assets.js";
import { cached } from "./cache.js";
import { getHistory, getSyntheticHistory } from "./marketData.js";
import {
  applyEngineModules,
  buildTechnicalPayloadForTimeframes,
  neutralTechnicalPayload,
} from "./technical.js";
import {
  normalizeInterval,
  normalizePeriod,
  resolveTimeframeStack,
  formatTfLabel,
} from "../utils/timeframeStack.js";

const CACHE_MS = 30_000;

function normalizeSymbol(symbol) {
  return String(symbol || "EURUSD")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

async function loadBars(symbol, interval, period) {
  try {
    const loaded = await getHistory(symbol, interval, period);
    const bars = loaded.bars;
    if (!Array.isArray(bars) || bars.length < 10) {
      return {
        bars: getSyntheticHistory(symbol, interval, period),
        synthetic: true,
        source: "model",
      };
    }
    return {
      bars,
      synthetic: Boolean(loaded.synthetic),
      source: loaded.source || (loaded.synthetic ? "model" : "live"),
    };
  } catch (err) {
    console.warn("[analysis] bars fallback:", symbol, interval, err.message);
    return {
      bars: getSyntheticHistory(symbol, interval, period),
      synthetic: true,
      source: "model",
    };
  }
}

/**
 * Full analysis for the chart's interval + mapped higher timeframe (always returns data).
 */
export async function getAssetAnalysis(
  symbol,
  chartInterval = "4h",
  chartPeriod = "1M",
  engineModules = null,
) {
  const key = normalizeSymbol(symbol);
  const interval = normalizeInterval(chartInterval);
  const period = normalizePeriod(chartPeriod);
  const stack = resolveTimeframeStack(interval, period);
  const moduleKey = engineModules
    ? JSON.stringify(engineModules)
    : "default";
  const cacheKey = `asset-analysis:${key}:${stack.chart.interval}:${stack.chart.period}:${moduleKey}`;

  try {
    return await cached(cacheKey, CACHE_MS, async () => {
      const meta = getAssetMeta(key);
      const profile = getAssetProfile(key);

      const [chartLoad, htfLoad] = await Promise.all([
        loadBars(key, stack.chart.interval, stack.chart.period),
        loadBars(key, stack.htf.interval, stack.htf.period),
      ]);

      let technical;
      try {
        technical = buildTechnicalPayloadForTimeframes(
          key,
          chartLoad.bars,
          htfLoad.bars,
          {
            chartInterval: stack.chart.interval,
            chartPeriod: stack.chart.period,
            htfInterval: stack.htf.interval,
            htfPeriod: stack.htf.period,
          },
        );
      } catch {
        technical = neutralTechnicalPayload(key);
      }

      if (engineModules) {
        technical = applyEngineModules(technical, engineModules);
      }

      const synthetic = chartLoad.synthetic || htfLoad.synthetic;

      return {
        symbol: key,
        assetClass: meta?.class || "forex",
        profile,
        technical,
        timeframe: {
          chart: stack.chart,
          htf: stack.htf,
          chartLabel: `${formatTfLabel(stack.chart.interval)} · ${stack.chart.period}`,
          htfLabel: `${formatTfLabel(stack.htf.interval)} · ${stack.htf.period}`,
        },
        meta: {
          asOf: new Date().toISOString(),
          barCount: chartLoad.bars.length,
          htfBarCount: htfLoad.bars.length,
          dataQuality: synthetic ? "synthetic" : "live",
          source: chartLoad.source || htfLoad.source || (synthetic ? "model" : "live"),
        },
      };
    });
  } catch (err) {
    console.warn("[analysis] cache error:", key, err.message);
    return {
      symbol: key,
      assetClass: getAssetMeta(key)?.class || "forex",
      profile: getAssetProfile(key),
      technical: neutralTechnicalPayload(key),
      timeframe: {
        chart: { interval, period },
        htf: stack.htf,
        chartLabel: `${formatTfLabel(interval)} · ${period}`,
        htfLabel: `${formatTfLabel(stack.htf.interval)} · ${stack.htf.period}`,
      },
      meta: {
        asOf: new Date().toISOString(),
        barCount: 0,
        dataQuality: "fallback",
      },
    };
  }
}

export async function getTechnicalAnalysis(
  asset,
  chartInterval = "4h",
  chartPeriod = "1M",
) {
  const bundle = await getAssetAnalysis(asset, chartInterval, chartPeriod);
  return bundle.technical;
}
