import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api/api.js';
import { normalizeOhlcRows } from '../utils/chartConfig.js';
import { patchLiveBar } from '../utils/chartCandleIntel.js';
import { normalizeInterval } from '../utils/timeframeStack.js';

function pollMsForInterval(interval) {
  const iv = normalizeInterval(interval);
  if (iv === '1m') return 4000;
  if (iv === '5m') return 5000;
  if (iv === '15m' || iv === '30m') return 7000;
  if (iv === '1h') return 9000;
  return 12000;
}

/**
 * Live OHLC for chart overlays — refreshes on interval, patches last bar with tape.
 */
export function useChartHistory(symbol, interval, period, livePrice) {
  const [bars, setBars] = useState([]);
  const [meta, setMeta] = useState({ synthetic: true, source: 'loading', asOf: null });

  useEffect(() => {
    if (!symbol) return undefined;
    let active = true;

    const load = async () => {
      try {
        const res = await api.market.getHistory(symbol, interval, period);
        if (!active) return;
        const rows =
          res?.success && Array.isArray(res.data) ? normalizeOhlcRows(res.data) : [];
        setBars(rows);
        setMeta({
          synthetic: Boolean(res?.meta?.synthetic),
          source: res?.meta?.source || (res?.meta?.synthetic ? 'model' : 'live'),
          asOf: new Date().toISOString(),
        });
      } catch {
        if (active) {
          setMeta((m) => ({ ...m, source: 'error', asOf: new Date().toISOString() }));
        }
      }
    };

    load();
    const id = setInterval(load, pollMsForInterval(interval));
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [symbol, interval, period]);

  const liveBars = useMemo(
    () => patchLiveBar(bars, livePrice),
    [bars, livePrice],
  );

  const isLiveTape = liveBars.length >= 2 && !meta.synthetic;

  return { bars: liveBars, meta, isLiveTape };
}
