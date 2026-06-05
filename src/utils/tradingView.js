/** Map platform symbols → TradingView exchange:symbol (shared with server/config/assets.js) */

import { getTradingViewTicker, getAssetMeta } from '@server/config/assets.js';

const ALIAS_TV = {
  ESUSD: 'SP:SPX',
  NQUSD: 'NASDAQ:NDX',
  US30USD: 'DJ:DJI',
  CLUSD: 'TVC:USOIL',
  US10Y: 'TVC:US10Y',
};

const INTERVAL_MAP = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '1h': '60',
  '4h': '240',
  '1day': 'D',
  '1week': 'W',
};

export function toTradingViewSymbol(asset) {
  const key = String(asset || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (!key) return 'FX:EURUSD';
  const fromCatalog = getTradingViewTicker(key);
  if (fromCatalog) return fromCatalog;
  if (ALIAS_TV[key]) return ALIAS_TV[key];
  return `FX:${key}`;
}

export function toTradingViewInterval(interval) {
  return INTERVAL_MAP[interval] || '240';
}

export function isTradingViewSupportedAsset(asset) {
  const key = String(asset || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (!key) return false;
  if (ALIAS_TV[key]) return true;
  return Boolean(getTradingViewTicker(key) || getAssetMeta(key));
}
