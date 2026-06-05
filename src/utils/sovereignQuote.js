/** Sovereign tape — header quote must match TradingView chart ticker, never model/synthetic. */

import { isModelDataQuality } from './marketQuote.js';

export const TRUSTED_TAPE_SOURCES = new Set(['tradingview', 'binance', 'twelve-data']);

/** Max drift vs last TV print before rejecting a lower-trust update (percent). */
export const TRUSTED_DRIFT_REJECT_PCT = 2.5;

/** Max age to hold last TV quote while syncing (ms). */
export const TRUSTED_STALE_MS = 45_000;

export function isTrustedTapeSource(source) {
  return TRUSTED_TAPE_SOURCES.has(String(source || '').toLowerCase());
}

export function priceDriftPct(a, b) {
  const x = Number(a);
  const y = Number(b);
  if (!Number.isFinite(x) || !Number.isFinite(y) || y <= 0) return null;
  return (Math.abs(x - y) / y) * 100;
}

function safeChangePercent(price, changePercent) {
  const ch = Number(changePercent);
  if (
    Number.isFinite(ch) &&
    Math.abs(ch) <= 95 &&
    !(Number(price) > 0 && Math.abs(ch) === 100)
  ) {
    return ch;
  }
  return 0;
}

function isFreshTrusted(quote, now = Date.now()) {
  if (!quote?.updatedAt) return true;
  const t = new Date(quote.updatedAt).getTime();
  if (!Number.isFinite(t)) return true;
  return now - t <= TRUSTED_STALE_MS;
}

/**
 * Header quote for the active chart symbol.
 * Never surfaces synthetic/model prices — shows syncing + last trusted TV print instead.
 *
 * @returns {{ price, changePercent, changeAbs, state, source, isLive, showPrice }}
 *   state: 'live' | 'syncing' | 'model'
 */
export function resolveSovereignHeaderQuote({
  symbol,
  priceData,
  lastTrustedQuote = null,
  historyBars = [],
  historySynthetic = false,
  dataQuality,
}) {
  const tape = priceData || {};
  const tapePrice = Number(tape.price);
  const hasTapePrice = Number.isFinite(tapePrice) && tapePrice > 0;
  const isSynthetic = Boolean(tape.synthetic);
  const isTv = tape.source === 'tradingview' && hasTapePrice && !isSynthetic;
  const isOtherTrusted =
    !isSynthetic && isTrustedTapeSource(tape.source) && hasTapePrice && tape.source !== 'yahoo';

  const chartLastClose =
    historyBars.length > 0 ? Number(historyBars[historyBars.length - 1]?.close) : null;
  const historyIsModel =
    historySynthetic || isModelDataQuality(dataQuality);

  const buildLive = (row, source, state = 'live') => {
    const price = Number(row.price);
    const changePercent = safeChangePercent(price, row.changePercent);
    return {
      price,
      changePercent,
      changeAbs: (price * changePercent) / 100,
      state,
      source,
      isLive: state === 'live' && source === 'tradingview',
      showPrice: true,
      symbol,
    };
  };

  // 1) TradingView scanner — same family as chart embed
  if (isTv) {
    if (
      lastTrustedQuote?.source === 'tradingview' &&
      Number(lastTrustedQuote.price) > 0
    ) {
      const drift = priceDriftPct(tapePrice, lastTrustedQuote.price);
      if (drift != null && drift > TRUSTED_DRIFT_REJECT_PCT * 4) {
        // wild tick — keep last good until next poll
        if (isFreshTrusted(lastTrustedQuote)) {
          return buildLive(lastTrustedQuote, 'tradingview', 'syncing');
        }
      }
    }
    return buildLive(tape, 'tradingview', 'live');
  }

  // 2) Other trusted live sources (binance, twelve) when TV unavailable
  if (isOtherTrusted) {
    if (
      lastTrustedQuote?.source === 'tradingview' &&
      Number(lastTrustedQuote.price) > 0 &&
      isFreshTrusted(lastTrustedQuote)
    ) {
      const drift = priceDriftPct(tapePrice, lastTrustedQuote.price);
      if (drift != null && drift > TRUSTED_DRIFT_REJECT_PCT) {
        return buildLive(lastTrustedQuote, 'tradingview', 'syncing');
      }
    }
    return buildLive(tape, tape.source, 'live');
  }

  // 3) Hold last TV print while turbo reconnects
  if (
    lastTrustedQuote?.source === 'tradingview' &&
    Number(lastTrustedQuote.price) > 0 &&
    isFreshTrusted(lastTrustedQuote)
  ) {
    return buildLive(lastTrustedQuote, 'tradingview', 'syncing');
  }

  // 4) No trusted tape — do NOT show synthetic/yahoo/model in header
  return {
    price: null,
    changePercent: null,
    changeAbs: null,
    state: 'syncing',
    source: tape.source || null,
    isLive: false,
    showPrice: false,
    symbol,
    historyIsModel,
    chartLastClose,
  };
}

/** Whether incoming bulk quote may replace existing row for the active symbol. */
export function shouldApplyTapeUpdate({ symbol, activeSymbol, existing, incoming, channel }) {
  if (!incoming?.price || !symbol) return false;

  const isActive = String(symbol).toUpperCase() === String(activeSymbol || '').toUpperCase();

  if (isActive && incoming.synthetic) return false;

  if (!existing?.price) return true;

  if (isActive && existing.source === 'tradingview' && incoming.source !== 'tradingview') {
    if (channel === 'rest' || channel === 'socket') return false;
  }

  if (existing.source === 'tradingview' && incoming.source !== 'tradingview') {
    if (channel === 'rest' || channel === 'socket') return false;
  }

  if (incoming.source === 'tradingview') return true;

  const rank = (row, ch) => {
    if (row?.source === 'tradingview') return 4;
    if (ch === 'turbo') return 3;
    if (ch === 'socket') return 2;
    if (ch === 'rest') return 1;
    return 0;
  };

  const inRank = rank(incoming, channel);
  const exRank = rank(existing, existing._channel || 'rest');
  if (inRank !== exRank) return inRank > exRank;

  return true;
}
