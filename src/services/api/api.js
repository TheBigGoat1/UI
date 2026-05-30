import axios from 'axios';
import { getToken, clearToken } from '../auth/authStorage.js';

/** In dev, use Vite proxy (/api → :3001) so the UI always reaches the API on the same origin. */
const API_BASE_URL =
  import.meta.env.VITE_API_URL && !import.meta.env.DEV
    ? import.meta.env.VITE_API_URL
    : import.meta.env.DEV
      ? '/api/v1'
      : import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
  transformResponse: [
    (data) => {
      if (data == null || data === '' || data === 'null' || data === 'undefined') {
        return { success: false, error: 'Empty response from API' };
      }
      if (typeof data === 'object') return data;
      const trimmed = String(data).trim();
      if (trimmed === 'null' || trimmed === 'undefined') {
        return { success: false, error: 'Empty response from API' };
      }
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed == null) return { success: false, error: 'Empty response from API' };
        return parsed;
      } catch {
        return {
          success: false,
          error: 'Invalid JSON from API — is the backend running on port 3001?',
        };
      }
    },
  ],
});

apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      clearToken();
      const inAdminArea = window.location.pathname.startsWith('/admin');
      const targetLogin = inAdminArea ? '/admin/login' : '/login';
      if (!window.location.pathname.startsWith(targetLogin)) {
        window.location.href = targetLogin;
      }
    }
    const offline =
      error.code === 'ECONNREFUSED' ||
      error.code === 'ERR_NETWORK' ||
      error.message?.includes('Network Error');
    return Promise.reject({
      success: false,
      error: offline
        ? 'API offline — open a terminal in UI-main and run: npm run dev:all'
        : error.response?.data?.error ||
          error.response?.data?.message ||
          'Server unreachable — ensure the API is running on port 3001',
      status: error.response?.status,
      code: error.response?.data?.code,
      capability: error.response?.data?.capability,
      upgrade: error.response?.data?.upgrade,
      access: error.response?.data?.access,
      offline,
    });
  },
);

const request = (method, url, data = null, params = null, options = {}) =>
  apiClient({ method, url, data, params, ...options });

/** Never throw — returns { success: false } on failure */
async function safeRequest(method, url, data = null, params = null, options = {}) {
  try {
    return await request(method, url, data, params, options);
  } catch (e) {
    return {
      success: false,
      error: e?.error || e?.message || 'Request failed',
      status: e?.status,
      code: e?.code,
    };
  }
}

export const api = {
  auth: {
    login: (payload) => request('POST', '/auth/login', payload),
    register: (payload) => request('POST', '/auth/register', payload),
    me: () => request('GET', '/auth/me'),
    completeSetup: (metadata) => request('PATCH', '/auth/setup-complete', metadata),
    saveOnboarding: (metadata) => request('PATCH', '/billing/onboarding', metadata),
    forgotPassword: (email) => request('POST', '/auth/forgot-password', { email }),
    resetPassword: (token, password) =>
      request('POST', '/auth/reset-password', { token, password }),
    updatePassword: (password) => request('PATCH', '/auth/password', { password }),
  },

  billing: {
    createCheckout: (payload) => request('POST', '/billing/checkout-session', payload),
    startDevTrial: (payload) => request('POST', '/billing/dev-trial', payload),
    verifySession: (sessionId) =>
      request('GET', '/billing/session', null, { session_id: sessionId }),
    portal: () => request('POST', '/billing/portal'),
    status: () => request('GET', '/billing/status'),
  },

  market: {
    getAllPrices: () => request('GET', '/market/prices'),
    getHistory: async (symbol, interval = '1day', period = '1M') => {
      try {
        const res = await request('GET', `/market/history/${symbol}`, null, {
          interval,
          period,
          outputsize: 500,
        });
        if (res?.success && Array.isArray(res.data) && res.data.length >= 2) {
          return {
            ...res,
            meta: {
              ...(res.meta || {}),
              synthetic: Boolean(res.meta?.synthetic),
              source: res.meta?.source || (res.meta?.synthetic ? 'model' : 'live'),
            },
          };
        }
      } catch (e) {
        /* fall through to client-side bars in callers */
      }
      return {
        success: false,
        error: 'History unavailable',
        data: [],
        meta: { synthetic: true, source: 'model' },
      };
    },
    getAssetProfile: (symbol) => request('GET', `/market/asset/${symbol}`),
    getAssetsList: () => request('GET', '/market/assets'),
  },

  brief: {
    getDaily: () => safeRequest('GET', '/brief/daily'),
  },

  trader: {
    getProfile: () => request('GET', '/trader/profile'),
    saveProfile: (payload) => request('PUT', '/trader/profile', payload),
    getHeat: () => request('GET', '/trader/heat'),
    getScorecard: () => request('GET', '/trader/scorecard'),
    getDebrief: () => request('GET', '/trader/debrief'),
    getSetupStats: (symbol) => request('GET', `/trader/setup-stats/${symbol}`),
    sizePreview: (idea_id) => request('POST', '/trader/size-preview', { idea_id }),
  },

  tradeIdeas: {
    getLatest: (minConfidence = 0, assetClass = 'all', withBrief = false) =>
      request('GET', '/ideas', null, {
        minConfidence,
        assetClass,
        ...(withBrief ? { brief: '1' } : {}),
      }),
    getById: (id) => request('GET', `/ideas/${id}`),
    generate: () => request('POST', '/ideas/generate', {}),
    getEngineStatus: () => request('GET', '/ideas/engine/status'),
    getTechnicalAnalysis: (asset) => request('GET', `/ideas/technical/${asset}`),
    runBacktest: (payload) => request('POST', '/backtest/run', payload),
  },

  backtest: {
    run: (payload) => safeRequest('POST', '/backtest/run', payload, null, { timeout: 120000 }),
  },

  trades: {
    getOpen: () => request('GET', '/trades/open'),
    accept: (idea_id, options = {}) =>
      request('POST', '/trades/accept', {
        idea_id,
        position_size: options.position_size,
        plan_agreed: options.plan_agreed,
        thesis_tag: options.thesis_tag,
        risk_percent_used: options.risk_percent_used,
      }),
    close: (id, exit_price, plan_followed) =>
      request('POST', `/trades/${id}/close`, { exit_price, plan_followed }),
    flattenAll: () => request('POST', '/trades/flatten-all'),
  },

  analysis: {
    getRiskEnvironment: () => request('GET', '/analysis/risk-environment'),
    getFundamental: (symbol) => request('GET', `/analysis/fundamental/${symbol}`),
    getAsset: async (symbol, interval = '4h', period = '1M') => {
      try {
        const res = await request('GET', `/analysis/asset/${symbol}`, null, {
          interval,
          period,
        });
        if (res?.success && res.data?.technical?.modules) return res;

        const legacy = await request('GET', `/analysis/technical/${symbol}`, null, {
          interval,
          period,
        });
        if (legacy?.success && legacy.data?.modules) {
          return {
            success: true,
            data: {
              symbol,
              technical: legacy.data,
              profile: null,
              meta: { dataQuality: 'live', source: 'technical-route' },
            },
          };
        }
        return res || { success: false, error: 'Analysis unavailable' };
      } catch (e) {
        return {
          success: false,
          error: e?.error || e?.message || 'Analysis unavailable',
        };
      }
    },
    getSentimentOverview: () => request('GET', '/ideas/sentiment/overview'),
  },

  sentiment: {
    getForAsset: (symbol) => request('GET', `/sentiment/${symbol}`),
  },

  news: {
    getAll: (params) => request('GET', '/news', null, params),
    getFeed: (limit = 30) => request('GET', '/news/feed', null, { limit }),
    sync: () => request('POST', '/news/sync'),
    getLatest: (limit = 20) => request('GET', '/news/latest', null, { limit }),
    search: (q, asset) =>
      request('GET', '/news/search', null, { q, ...(asset ? { asset } : {}) }),
    getSources: () => request('GET', '/news/sources'),
    getStats: () => request('GET', '/news/stats'),
    getConnections: () => request('GET', '/news/connections'),
    getByAssetPath: (asset, params) =>
      request('GET', `/news/asset/${asset}`, null, params),
  },

  calendar: {
    getEvents: (params) => request('GET', '/calendar/events', null, params),
    getSummary: (year) => request('GET', '/calendar/events/summary', null, { year }),
    getYears: () => request('GET', '/calendar/events/years'),
    sync: (body) => request('POST', '/calendar/sync', body || {}),
    getCountries: () => request('GET', '/calendar/countries'),
    getForAsset: (symbol, params) =>
      request('GET', `/calendar/events/asset/${symbol}`, null, params),
  },

  economy: {
    getCountries: () => request('GET', '/economy/countries'),
    getCountry: (country) => request('GET', `/economy/countries/${country}`),
    sync: () => request('POST', '/economy/sync'),
  },

  technical: {
    getAnalysis: (asset) => request('GET', `/analysis/technical/${asset}`),
  },

  system: {
    getHealth: () => request('GET', '/health'),
    getDataSources: () => request('GET', '/data-sources'),
  },

  journal: {
    getTrades: () => safeRequest('GET', '/journal/trades'),
    createTrade: (data) => safeRequest('POST', '/journal/trades', data),
  },

  connections: {
    list: () => request('GET', '/connections'),
    connect: (data) => request('POST', '/connections', data),
    sync: (exchangeId) => request('POST', `/connections/${exchangeId}/sync`),
  },

  monitoring: {
    getNotifications: () => request('GET', '/notifications'),
    getLogs: () => request('GET', '/logs'),
  },

  alerts: {
    getRules: () => request('GET', '/alerts/rules'),
    updateRule: (ruleKey, payload) => request('PUT', `/alerts/rules/${ruleKey}`, payload),
    getEvents: () => request('GET', '/alerts/events'),
  },

  admin: {
    getAccess: () => request('GET', '/admin/access'),
    getAdmins: () => request('GET', '/admin/admins'),
    addAdmin: (payload) => request('POST', '/admin/admins', payload),
    removeAdmin: (email) => request('DELETE', `/admin/admins/${encodeURIComponent(email)}`),
    getOverview: () => request('GET', '/admin/overview'),
    getUsers: (params) => request('GET', '/admin/users', null, params),
    updateSubscription: (id, payload) =>
      request('PATCH', `/admin/users/${id}/subscription`, payload),
    getProviderSla: () => request('GET', '/admin/observability/providers'),
    upsertProviderSla: (payload) => request('POST', '/admin/observability/providers', payload),
    getErrorSummary: () => request('GET', '/admin/observability/errors'),
    getJobHealth: () => request('GET', '/admin/observability/jobs'),
    putJobHeartbeat: (payload) => request('POST', '/admin/observability/jobs', payload),
    getIncidents: () => request('GET', '/admin/incidents'),
    createIncident: (payload) => request('POST', '/admin/incidents', payload),
    updateIncident: (id, payload) => request('PATCH', `/admin/incidents/${id}`, payload),
    getAudit: () => request('GET', '/admin/audit'),
  },

  portfolio: {
    getLiveStats: () => safeRequest('GET', '/portfolio/stats'),
  },

  chat: {
    send: (message) => request('POST', '/chat', { message }),
  },
};

/** @deprecated use api.tradeIdeas — kept for gradual migration */
export const ideas = api.tradeIdeas;
