import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api/api.js';
import { buildAnalysisFromBars } from '../utils/clientAnalysis.js';
import { resolveTimeframeStack } from '../utils/timeframeStack.js';
import {
  buildClientSyntheticHistory,
  formatIntervalLabel,
  normalizeOhlcRows,
} from '../utils/chartConfig.js';
import { friendlyApiError } from '../utils/friendlyApiError.js';

export { friendlyApiError };

const REFRESH_MS = 45_000;

const DEFAULT_PROFILE = {
  typical_behaviour:
    'Follows session liquidity and macro risk flows. Align higher timeframe structure with your chart before sizing up.',
  key_drivers: { countries: ['US', 'EU', 'Global'] },
  correlations: { positive: [], negative: [] },
};

function clientBars(symbol, interval, period) {
  return normalizeOhlcRows(buildClientSyntheticHistory(symbol, interval, period));
}

async function resolveBars(symbol, interval, period) {
  try {
    const res = await api.market.getHistory(symbol, interval, period);
    if (res?.success && Array.isArray(res.data) && res.data.length >= 5) {
      const synthetic = Boolean(res.meta?.synthetic);
      return {
        bars: res.data,
        synthetic,
        source: res.meta?.source || (synthetic ? 'model' : 'live'),
      };
    }
  } catch {
    /* fall through */
  }
  return { bars: clientBars(symbol, interval, period), synthetic: true, source: 'model' };
}

function bundleFromBars(key, chartBars, htfBars, interval, period, profile, source, synthetic) {
  const stack = resolveTimeframeStack(interval, period);
  const technical = buildAnalysisFromBars(key, chartBars, htfBars, interval, period);
  return {
    symbol: key,
    technical,
    timeframe: {
      chart: stack.chart,
      htf: stack.htf,
      chartLabel: technical.modules.marketStructure.ltf.label,
      htfLabel: technical.modules.marketStructure.htf.label,
    },
    profile: profile || DEFAULT_PROFILE,
    meta: {
      asOf: new Date().toISOString(),
      barCount: chartBars.length,
      dataQuality: synthetic ? 'model' : 'live',
      source,
    },
  };
}

function waitingBundle(symbol, interval, period) {
  const key = String(symbol || 'EURUSD')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const stack = resolveTimeframeStack(interval, period);
  return {
    symbol: key,
    technical: {
      asset: key,
      bias: 'neutral',
      confidence: null,
      summary: 'Connecting to live market data for a real multi-timeframe read…',
      modules: {
        marketStructure: {
          htf: { trend: '—', label: `${stack.htf.interval} · ${stack.htf.period}` },
          ltf: { trend: '—', label: `${formatIntervalLabel(interval)} · ${period}` },
          alignment: null,
        },
        momentum: { rsi: null, state: null },
        volatility: { state: '—', atrPct: null },
        levels: { support: null, resistance: null, last: null },
      },
    },
    timeframe: {
      chart: stack.chart,
      htf: stack.htf,
      chartLabel: `${formatIntervalLabel(interval)} · ${period}`,
      htfLabel: `${stack.htf.interval} · ${stack.htf.period}`,
    },
    profile: DEFAULT_PROFILE,
    meta: {
      asOf: new Date().toISOString(),
      dataQuality: 'pending',
      source: 'waiting',
    },
  };
}

/**
 * Live analysis only — no fake synthetic trends. Shows waiting state until real data arrives.
 */
export function useAssetAnalysis(symbol, interval = '4h', period = '1M', basePrice = null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(
    async (opts = {}) => {
      const key = String(symbol || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
      if (!key) {
        setData(null);
        setError(null);
        setLoading(false);
        setUsingFallback(false);
        return;
      }

      const id = ++requestId.current;
      if (!opts.silent) {
        setLoading(true);
        setData(waitingBundle(key, interval, period));
      }
      setError(null);

      try {
        let profile = DEFAULT_PROFILE;
        const res = await api.analysis.getAsset(key, interval, period);
        if (id !== requestId.current) return;

        if (res?.success && res.data?.technical?.modules) {
          const quality = res.data.meta?.dataQuality || 'live';
          setData(res.data);
          setUsingFallback(quality === 'synthetic' || quality === 'fallback');
          setError(null);
          return;
        }

        if (res?.data?.profile) profile = res.data.profile;

        const stack = resolveTimeframeStack(interval, period);
        const [chartLoad, htfLoad] = await Promise.all([
          resolveBars(key, stack.chart.interval, stack.chart.period),
          resolveBars(key, stack.htf.interval, stack.htf.period),
        ]);
        if (id !== requestId.current) return;

        const synthetic = chartLoad.synthetic || htfLoad.synthetic;
        const bundle = bundleFromBars(
          key,
          chartLoad.bars,
          htfLoad.bars,
          interval,
          period,
          profile,
          synthetic ? 'model-bars' : 'history-bars',
          synthetic,
        );
        setData(bundle);
        setUsingFallback(synthetic);
        setError(null);
      } catch (err) {
        if (id !== requestId.current) return;
        const stack = resolveTimeframeStack(interval, period);
        const chartBars = clientBars(key, stack.chart.interval, stack.chart.period);
        const htfBars = clientBars(key, stack.htf.interval, stack.htf.period);
        setData(
          bundleFromBars(
            key,
            chartBars,
            htfBars,
            interval,
            period,
            DEFAULT_PROFILE,
            'client-model',
            true,
          ),
        );
        setUsingFallback(true);
        setError(null);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [symbol, interval, period],
  );

  useEffect(() => {
    load();
    const timer = setInterval(() => load({ silent: true }), REFRESH_MS);
    return () => {
      requestId.current += 1;
      clearInterval(timer);
    };
  }, [load]);

  return {
    data,
    technical: data?.technical ?? null,
    timeframe: data?.timeframe ?? null,
    profile: data?.profile ?? DEFAULT_PROFILE,
    meta: data?.meta ?? null,
    loading,
    error,
    usingFallback,
    refresh: () => load(),
  };
}
