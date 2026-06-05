import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api/api.js';
import {
  cacheKeyForCalendarEvent,
  getCachedCalendarAnalysis,
  setCachedCalendarAnalysis,
} from '../utils/brainAnalysisCache.js';

const inflight = new Map();

function fetchCalendarAnalysis(event, symbol, cacheKey) {
  const existing = inflight.get(cacheKey);
  if (existing) return existing;

  const promise = api.desk
    .analyzeCalendarEvent(event, symbol)
    .then((res) => {
      const payload = res?.data || res;
      if (payload?.analysis || payload?.sections) {
        setCachedCalendarAnalysis(cacheKey, payload);
      }
      return payload;
    })
    .finally(() => {
      inflight.delete(cacheKey);
    });

  inflight.set(cacheKey, promise);
  return promise;
}

/**
 * Calendar event → Claude desk read (deduped + session cached).
 * @param {object|null} event
 * @param {string} symbol
 * @param {{ enabled?: boolean }} options
 */
export function useCalendarEventAnalysis(event, symbol = 'XAUUSD', options = {}) {
  const { enabled = true } = options;
  const cacheKey = useMemo(
    () => (event ? cacheKeyForCalendarEvent(event, symbol) : null),
    [event?.id, event?.event_name, event?.event, event?.event_time, symbol],
  );

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled || !event || !cacheKey) {
      setLoading(false);
      setData(null);
      setError('');
      return undefined;
    }

    const cached = getCachedCalendarAnalysis(cacheKey);
    if (cached) {
      setData(cached);
      setLoading(false);
      setError('');
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError('');
    setData(null);

    fetchCalendarAnalysis(event, symbol, cacheKey)
      .then((payload) => {
        if (!active) return;
        if (!payload?.analysis && !payload?.sections) {
          setError('No analysis returned for this release.');
          return;
        }
        setData(payload);
      })
      .catch((e) => {
        if (active) setError(e?.error || 'Could not load desk analysis.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [cacheKey, enabled, event, symbol]);

  return { loading, data, error, cacheKey };
}
