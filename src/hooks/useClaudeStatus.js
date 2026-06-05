import { useEffect, useState } from 'react';
import { api } from '../services/api/api.js';

const TTL_MS = 60_000;
let cached = null;
let cachedAt = 0;
let inflight = null;

async function fetchClaudeStatus() {
  if (cached && Date.now() - cachedAt < TTL_MS) return cached;
  if (inflight) return inflight;
  inflight = api.desk
    .getAiStatus()
    .then((res) => {
      const data = res?.data || {};
      cached = {
        anthropicConfigured: Boolean(data.anthropicConfigured),
        model: data.model || null,
      };
      cachedAt = Date.now();
      return cached;
    })
    .catch(() => ({ anthropicConfigured: null, model: null }))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Shared Claude / API key status — one request per minute app-wide */
export function useClaudeStatus() {
  const [status, setStatus] = useState(cached);

  useEffect(() => {
    let active = true;
    fetchClaudeStatus().then((data) => {
      if (active) setStatus(data);
    });
    return () => {
      active = false;
    };
  }, []);

  return {
    claudeConfigured: status?.anthropicConfigured ?? null,
    model: status?.model ?? null,
  };
}
