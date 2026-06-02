/** Per-tab defaults — what each filter is meant to surface */
import { pickPriceRow } from './deskSymbols.js';

export const NEWS_TAB_CONFIG = {
  all: {
    label: 'All',
    hint: 'Full wire — cross-asset movers',
    assets: ['DXY', 'VIX', 'XLE', 'ESUSD', 'XAUUSD', 'EURUSD', 'BTCUSD'],
  },
  popular: {
    label: 'Popular',
    hint: 'Most discussed — multi-symbol stories',
    assets: ['ESUSD', 'NQUSD', 'BTCUSD', 'XAUUSD', 'EURUSD', 'VIX'],
  },
  breaking: {
    label: 'Breaking News',
    hint: 'Geopolitical & fast-moving risk',
    assets: ['CLUSD', 'BZUSD', 'XAUUSD', 'VIX', 'BTCUSD', 'ESUSD', 'DXY'],
  },
  high: {
    label: 'High Impact',
    hint: 'Volatility & macro shocks',
    assets: ['VIX', 'XAUUSD', 'ESUSD', 'DXY', 'EURUSD', 'US10Y', 'CLUSD'],
  },
  econ: {
    label: 'Economic Data',
    hint: 'Rates, inflation, central banks',
    assets: ['DXY', 'EURUSD', 'XAUUSD', 'ESUSD', 'US10Y', 'GBPUSD', 'VIX'],
  },
};

export function matchesNewsTab(item, tab) {
  if (tab === 'all') return true;
  const title = (item?.title || '').toLowerCase();
  const summary = (item?.description || item?.summary || '').toLowerCase();
  const text = `${title} ${summary}`;
  const impact = (item?.impact || item?.category || '').toLowerCase();

  if (tab === 'breaking') {
    return (
      item?.breaking ||
      text.includes('breaking') ||
      text.includes('attack') ||
      text.includes('war') ||
      text.includes('israel') ||
      text.includes('iran') ||
      text.includes('ceasefire') ||
      impact.includes('high')
    );
  }
  if (tab === 'high') {
    return (
      impact.includes('high') ||
      Math.abs(item?.sentiment_score ?? 0) > 0.25 ||
      text.includes('surge') ||
      text.includes('crash') ||
      text.includes('plunge') ||
      text.includes('soar')
    );
  }
  if (tab === 'econ') {
    return (
      text.includes('cpi') ||
      text.includes('gdp') ||
      text.includes('fed') ||
      text.includes('fomc') ||
      text.includes('nfp') ||
      text.includes('inflation') ||
      text.includes('ecb') ||
      text.includes('boe') ||
      text.includes('rate') ||
      text.includes('jobs') ||
      impact.includes('economic')
    );
  }
  if (tab === 'popular') {
    return (item?.symbols?.length || 0) >= 1 || Math.abs(item?.sentiment_score ?? 0) > 0.12;
  }
  return true;
}

/** Tickers shown in the tab bar for the active category */
export function getTabBarAssets(tab, items = [], deskAsset = 'XAUUSD') {
  const cfg = NEWS_TAB_CONFIG[tab] || NEWS_TAB_CONFIG.all;
  const fromHeadlines = items.flatMap((item) =>
    inferWatchAssets(item, deskAsset, tab),
  );
  const merged = [...new Set([...cfg.assets, ...fromHeadlines, deskAsset])];
  return merged.slice(0, 8);
}

/** Infer tickers to show on a headline (MRKT "Assets to watch") */
export function inferWatchAssets(item, deskAsset = 'XAUUSD', tab = 'all') {
  const fromSymbols = (item?.symbols || item?.assets || [])
    .map((s) => String(s).toUpperCase())
    .filter(Boolean);
  if (fromSymbols.length >= 2) return fromSymbols.slice(0, 8);

  const tabDefaults = NEWS_TAB_CONFIG[tab]?.assets;
  if (tab && tab !== 'all' && tabDefaults?.length) {
    const title = (item?.title || '').toLowerCase();
    const headlineSpecific = inferFromTitle(title, deskAsset);
    const merged = [...new Set([...fromSymbols, ...headlineSpecific, ...tabDefaults])];
    if (merged.length >= 2) return merged.slice(0, 8);
  }

  const title = (item?.title || '').toLowerCase();
  return inferFromTitle(title, deskAsset, fromSymbols);
}

function inferFromTitle(title, deskAsset, fromSymbols = []) {
  let defaults = [];

  if (
    title.includes('war') ||
    title.includes('attack') ||
    title.includes('israel') ||
    title.includes('iran') ||
    title.includes('hezbollah') ||
    title.includes('middle east')
  ) {
    defaults = ['CLUSD', 'BZUSD', 'XAUUSD', 'VIX', 'BTCUSD', 'ESUSD'];
  } else if (
    title.includes('fed') ||
    title.includes('cpi') ||
    title.includes('inflation') ||
    title.includes('rate') ||
    title.includes('ecb')
  ) {
    defaults = ['DXY', 'EURUSD', 'XAUUSD', 'ESUSD', 'VIX', 'US10Y'];
  } else if (title.includes('ipo') || title.includes('earnings') || title.includes('tech')) {
    defaults = ['NQUSD', 'QQQ', 'ESUSD', 'VIX', 'BTCUSD'];
  } else {
    defaults = [deskAsset, 'ESUSD', 'VIX', 'EURUSD', 'XAUUSD', 'BTCUSD'];
  }

  const merged = [...new Set([...fromSymbols, ...defaults.map((s) => s.replace('^', ''))])];
  return merged.slice(0, 8);
}

export function tabEmptyMessage(tab) {
  const cfg = NEWS_TAB_CONFIG[tab];
  return cfg
    ? `No ${cfg.label.toLowerCase()} headlines right now — showing assets this tab usually moves.`
    : 'No headlines match this filter.';
}

export function getPriceRow(symbol, prices = {}) {
  return pickPriceRow(prices, symbol);
}

export function formatAssetPct(symbol, prices = {}) {
  const row = getPriceRow(symbol, prices);
  if (!row) return { changePct: 0, label: '—' };
  const changePct = Number(row.change_percent ?? row.changePercent ?? row.change ?? 0);
  const sign = changePct >= 0 ? '+' : '';
  return { changePct, label: `${sign}${changePct.toFixed(2)}%` };
}

export function primaryAssetForNews(item, deskAsset = 'XAUUSD', tab = 'all') {
  const list = inferWatchAssets(item, deskAsset, tab);
  if (list.includes(deskAsset)) return deskAsset;
  return list[0] || deskAsset;
}

export function assetDirection(symbol, prices = {}) {
  const keys = [symbol, symbol.replace('^', ''), `^${symbol}`];
  let row = null;
  for (const k of keys) {
    if (prices[k]) {
      row = prices[k];
      break;
    }
  }
  if (!row) return 'neutral';
  const ch = Number(row.change_percent ?? row.changePercent ?? row.change ?? 0);
  if (ch > 0.02) return 'up';
  if (ch < -0.02) return 'down';
  return 'neutral';
}

export function formatNewsTime(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return { clock: '—', ago: 'Recently' };
  const clock = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  let ago = 'Just now';
  if (mins >= 1 && mins < 60) ago = `${mins}m ago`;
  else if (mins >= 60 && mins < 1440) ago = `${Math.floor(mins / 60)}h ago`;
  else if (mins >= 1440) ago = `${Math.floor(mins / 1440)}d ago`;
  return { clock, ago };
}

/** Single timestamp line for Insidr news feed cards */
export function formatNewsDisplayTime(dateStr) {
  const { clock, ago } = formatNewsTime(dateStr);
  if (ago === 'Just now') return 'Just now';
  if (ago === 'Recently') return ago;
  return ago;
}

export function isJustNowHeadline(dateStr) {
  return formatNewsTime(dateStr).ago === 'Just now';
}

export function newsImpactLabel(item) {
  const title = (item?.title || '').toLowerCase();
  const impact = (item?.impact || item?.category || '').toLowerCase();
  const score = Math.abs(item?.sentiment_score ?? 0);
  if (item?.breaking || title.includes('breaking') || impact.includes('high') || score > 0.35) {
    return 'HIGH IMPACT';
  }
  if (impact.includes('medium') || score > 0.18) return 'MEDIUM IMPACT';
  return null;
}

export function isBreakingItem(item) {
  const title = (item?.title || '').toLowerCase();
  return Boolean(
    item?.breaking ||
      title.includes('breaking') ||
      Math.abs(item?.sentiment_score ?? 0) > 0.35,
  );
}
