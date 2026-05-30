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
};

const FOREX = new Set([
  'EURUSD',
  'GBPUSD',
  'USDJPY',
  'AUDUSD',
  'USDCAD',
  'USDCHF',
  'NZDUSD',
]);

const COMMODITY_TV = {
  XAUUSD: 'OANDA:XAUUSD',
  XAGUSD: 'OANDA:XAGUSD',
  USOIL: 'TVC:USOIL',
};

const INDEX_TV = {
  US500: 'SP:SPX',
  US30: 'DJ:DJI',
  NAS100: 'NASDAQ:NDX',
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
  if (FOREX.has(key)) return `FX:${key}`;
  if (key.endsWith('USD') && key.length > 6) {
    const base = key.slice(0, -3);
    return `BINANCE:${base}USDT`;
  }
  return `FX:${key}`;
}

export function toTradingViewInterval(interval) {
  return INTERVAL_MAP[interval] || '240';
}
