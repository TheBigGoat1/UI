/** Map platform symbols → TradingView exchange:symbol format */

const CRYPTO_TV = {
  BTCUSD: 'BINANCE:BTCUSDT',
  ETHUSD: 'BINANCE:ETHUSDT',
  BNBUSD: 'BINANCE:BNBUSDT',
  SOLUSD: 'BINANCE:SOLUSDT',
  XRPUSD: 'BINANCE:XRPUSDT',
  ADAUSD: 'BINANCE:ADAUSDT',
  DOGEUSD: 'BINANCE:DOGEUSDT',
  AVAXUSD: 'BINANCE:AVAXUSDT',
  LINKUSD: 'BINANCE:LINKUSDT',
  DOTUSD: 'BINANCE:DOTUSDT',
  LTCUSD: 'BINANCE:LTCUSDT',
  ATOMUSD: 'BINANCE:ATOMUSDT',
  TRXUSD: 'BINANCE:TRXUSDT',
  BCHUSD: 'BINANCE:BCHUSDT',
  ETCUSD: 'BINANCE:ETCUSDT',
  NEARUSD: 'BINANCE:NEARUSDT',
  APTUSD: 'BINANCE:APTUSDT',
  ARBUSD: 'BINANCE:ARBUSDT',
  OPUSD: 'BINANCE:OPUSDT',
  SUIUSD: 'BINANCE:SUIUSDT',
  UNIUSD: 'BINANCE:UNIUSDT',
  FILUSD: 'BINANCE:FILUSDT',
};

const FOREX_CODES = new Set([
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'AUD',
  'CAD',
  'CHF',
  'NZD',
  'NOK',
  'SEK',
  'SGD',
  'HKD',
]);

const COMMODITY_TV = {
  XAUUSD: 'FOREXCOM:XAUUSD',
  XAGUSD: 'FOREXCOM:XAGUSD',
  USOIL: 'TVC:USOIL',
  CLUSD: 'TVC:USOIL',
  BZUSD: 'TVC:UKOIL',
  NATGAS: 'TVC:NATGAS',
  COPPER: 'COMEX:HG1!',
};

const INDEX_TV = {
  US500: 'SP:SPX',
  US30: 'DJ:DJI',
  NAS100: 'NASDAQ:NDX',
  ESUSD: 'SP:SPX',
  NQUSD: 'NASDAQ:NDX',
  US30USD: 'DJ:DJI',
  DXY: 'TVC:DXY',
  VIX: 'CBOE:VIX',
  US10Y: 'TVC:US10Y',
  GER40: 'XETR:DAX',
  UK100: 'TVC:UKX',
  JP225: 'TVC:NI225',
  HK50: 'HSI:HSI',
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
  if (CRYPTO_TV[key]) return CRYPTO_TV[key];
  if (COMMODITY_TV[key]) return COMMODITY_TV[key];
  if (INDEX_TV[key]) return INDEX_TV[key];
  if (key.length === 6 && FOREX_CODES.has(key.slice(0, 3)) && FOREX_CODES.has(key.slice(3, 6))) {
    return `FX:${key}`;
  }
  if (key.endsWith('USD') && key.length > 6) {
    const base = key.slice(0, -3);
    return `BINANCE:${base}USDT`;
  }
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
  if (CRYPTO_TV[key] || COMMODITY_TV[key] || INDEX_TV[key]) return true;
  // Standard FX pairs like EURUSD, GBPJPY, etc.
  if (key.length === 6 && FOREX_CODES.has(key.slice(0, 3)) && FOREX_CODES.has(key.slice(3, 6))) {
    return true;
  }
  return false;
}
