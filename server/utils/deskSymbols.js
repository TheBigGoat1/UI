/**
 * Desk symbol aliases — UI/desk code uses ESUSD/NQUSD/CLUSD; price feed uses US500/NAS100/USOIL.
 */
export const DESK_PRICE_ALIASES = {
  ESUSD: ['US500', 'SPX500', 'US500USD', '^GSPC'],
  NQUSD: ['NAS100', 'US100', 'NDX', '^NDX'],
  CLUSD: ['USOIL', 'WTI', 'CL=F'],
  US30USD: ['US30', '^DJI'],
  DXY: ['DX-Y=F', 'UUP'],
};

export function deskSymbolKeys(symbol) {
  const s = String(symbol || '').toUpperCase();
  const keys = [s, s.replace('^', ''), `^${s}`];
  const aliases = DESK_PRICE_ALIASES[s];
  if (aliases) keys.push(...aliases);
  return [...new Set(keys)];
}

export function pickPriceRow(prices, symbol) {
  if (!prices || !symbol) return null;
  for (const k of deskSymbolKeys(symbol)) {
    const row = prices[k];
    if (row && row.price != null) return row;
  }
  return null;
}

/** Expand canonical feed keys into desk aliases (ESUSD, NQUSD, …). */
export function applyDeskPriceAliases(prices = {}) {
  const out = { ...prices };
  for (const [alias, sources] of Object.entries(DESK_PRICE_ALIASES)) {
    if (out[alias]?.price != null) continue;
    for (const src of sources) {
      if (out[src]?.price != null) {
        out[alias] = { ...out[src], deskAlias: src };
        break;
      }
    }
  }
  return out;
}

export const SECTOR_ETF_YAHOO = [
  { ticker: 'XLK', name: 'Technology', yahoo: 'XLK' },
  { ticker: 'XLE', name: 'Energy', yahoo: 'XLE' },
  { ticker: 'QQQ', name: 'Nasdaq-100', yahoo: 'QQQ' },
  { ticker: 'SPY', name: 'S&P 500', yahoo: 'SPY' },
  { ticker: 'VTI', name: 'Total Market', yahoo: 'VTI' },
  { ticker: 'DIA', name: 'Dow Jones', yahoo: 'DIA' },
  { ticker: 'XLF', name: 'Financials', yahoo: 'XLF' },
  { ticker: 'IWM', name: 'Russell 2000', yahoo: 'IWM' },
  { ticker: 'XLI', name: 'Industrials', yahoo: 'XLI' },
  { ticker: 'XLRE', name: 'Real Estate', yahoo: 'XLRE' },
  { ticker: 'XLV', name: 'Healthcare', yahoo: 'XLV' },
  { ticker: 'XLP', name: 'Consumer Staples', yahoo: 'XLP' },
  { ticker: 'XLU', name: 'Utilities', yahoo: 'XLU' },
];
