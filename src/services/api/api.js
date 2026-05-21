import axios from 'axios';
import { supabase } from '../api/supabase.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://theinsidr.ai/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// --- SUPABASE AUTH INTERCEPTOR ---
apiClient.interceptors.request.use(
  async (config) => {
    // Dynamically grab the secure session from Supabase right before the request fires
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error fetching session in request interceptor:', error);
      return config;
    }
    
    // If a session exists, attach the Supabase access token
    if (session?.access_token) {
      config.headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// --- RESPONSE INTERCEPTOR ---
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    
    // Catch global unauthenticated states (e.g. expired tokens)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      await supabase.auth.signOut();
      window.location.href = '/login';
    }

    // Reject the promise so React UI layers trigger their catch() blocks properly
    return Promise.reject({
      success: false,
      error: error.response?.data?.error?.message || error.response?.data?.message || 'Server unreachable',
      status: error.response?.status
    });
  }
);

const request = (method, url, data = null, params = null) => {
  return apiClient({ method, url, data, params });
};

// --- COMPLETE API EXPORT ---
export const api = {
  auth: {
    login: (email, password) => request('POST', '/auth/login', { email, password }),
    register: (userData) => request('POST', '/auth/register', userData),
    logout: () => request('POST', '/auth/logout'),
    me: () => request('GET', '/auth/me'),
  },
  
  market: {
    getAllPrices: () => request('GET', '/market/prices'),
    getHistory: (symbol, interval = '1day', period = '1M') => request('GET', `/market/history/${symbol}`, null, { interval, outputsize: 500 }),
    getAssetProfile: (symbol) => request('GET', `/market/asset/${symbol}`),
    getAssetsList: () => request('GET', '/market/assets'),
  },

  tradeIdeas: {
    getLatest: (minConfidence = 0) => request('GET', '/ideas', null, { minConfidence }),
    getById: (id) => request('GET', `/ideas/${id}`),
    generate: (data = null) => request('POST', '/ideas/generate', data),
    getTechnicalAnalysis: (asset) => request('GET', `/ideas/technical/${asset}`),
  },
  ideas: {
    runBacktest: (payload) => request('POST', '/backtest/run', payload) 
  },
  
  trades: {
    getOpen: () => request('GET', '/trades/open'), 
    accept: (idea_id, position_size = 1) => request('POST', '/trades/accept', { idea_id, position_size }),
    close: (id, exit_price) => request('POST', `/trades/${id}/close`, { exit_price }) 
  },
  
  analysis: {
    getRiskEnvironment: () => request('GET', '/analysis/risk-environment'),
    getFundamental: (symbol) => request('GET', `/analysis/fundamental/${symbol}`),
    getSentimentOverview: () => request('GET', '/ideas/sentiment/overview'),
  },
  sentiment: {
    getForAsset: (symbol) => request('GET', `/sentiment/${symbol}`),
  },
  
  news: {
    getAll: (params) => request('GET', '/news', null, params),
    getLatest: (limit = 20) => request('GET', '/news/latest', null, { limit }),
    search: (q, asset) => request('GET', '/news/search', null, { q, asset }),
    getSources: (asset) => request('GET', '/news/sources', null, { asset }),
    getStats: () => request('GET', '/news/stats'),
    getByAssetPath: (asset, params) => request('GET', `/news/${asset}`, null, params), 
  },
  
  calendar: {
    getEvents: (params) => request('GET', '/calendar/events', null, params),
    getForAsset: (symbol, params) => request('GET', `/calendar/events/asset/${symbol}`, null, params),
  },
  technical: {
    getAnalysis: (asset) => request('GET', `/ideas/technical/${asset}`),
  },
  system: {
    getHealth: () => request('GET', '/health'),
  },

  journal: {
    getTrades: () => request('GET', '/journal/trades'),
    createTrade: (data) => request('POST', '/journal/trades', data),
  },
  portfolio: {
    getLiveStats: () => request('GET', '/portfolio/stats'),
  }
};
