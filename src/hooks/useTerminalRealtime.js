import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api/api.js';
import { subscribeSocket, getSocket } from '../services/realtime/socket.js';
import { applyDeskPriceAliases } from '../utils/deskSymbols.js';
import { userMessageFromError } from '../utils/apiError.js';

const PRICE_POLL_MS = 800;
const TURBO_QUOTE_MS = 550;
const NEWS_POLL_MS = 8000;

/**
 * Modular realtime layer for the home terminal — prices, news, connection status, errors.
 */
export function useTerminalRealtime(selectedAsset) {
  const [assetsList, setAssetsList] = useState([]);
  const [prices, setPrices] = useState({});
  const [headlineNews, setHeadlineNews] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const [newsError, setNewsError] = useState(null);
  const [newsLoading, setNewsLoading] = useState(true);
  const [socketLive, setSocketLive] = useState(false);
  const [lastPriceSync, setLastPriceSync] = useState(null);
  const [lastNewsSync, setLastNewsSync] = useState(null);
  const [priceSource, setPriceSource] = useState('init');
  const newsBusyRef = useRef(false);

  const applyPrices = useCallback((data, source = 'rest') => {
    if (!data || !Object.keys(data).length) return false;
    setPrices((prev) => applyDeskPriceAliases({ ...prev, ...data }));
    setLastPriceSync(Date.now());
    setPriceSource(source);
    setFetchError(null);
    return true;
  }, []);

  const loadMarketData = useCallback(async () => {
    setFetchError(null);
    try {
      const [listRes, pricesRes] = await Promise.all([
        api.market.getAssetsList(),
        api.market.getAllPrices(),
      ]);
      if (listRes?.success && Array.isArray(listRes.data) && listRes.data.length) {
        setAssetsList(listRes.data);
      }
      const ok = applyPrices(pricesRes?.data, 'rest');
      if (!ok) {
        setFetchError('Market prices unavailable. Start the API with npm run dev:all');
      }
    } catch (err) {
      setFetchError(userMessageFromError(err, 'Cannot reach API. Start the server with npm run dev:all'));
    }
  }, [applyPrices]);

  const loadHeadlineNews = useCallback(async () => {
    if (!selectedAsset || newsBusyRef.current) return;
    newsBusyRef.current = true;
    setNewsLoading(true);
    try {
      let rows = [];
      const res = await api.news.getByAssetPath(selectedAsset, { page: 1, limit: 40 });
      rows = res?.data || [];
      if (!rows.length) {
        const all = await api.news.getAll({ page: 1, limit: 40 });
        rows = all?.data || [];
      }
      if (!rows.length) {
        const live = await api.news.getFeed(24);
        rows = live?.data || [];
      }
      setHeadlineNews(Array.isArray(rows) ? rows : []);
      setLastNewsSync(Date.now());
      setNewsError(null);
    } catch (err) {
      setNewsError(userMessageFromError(err, 'News feed reconnecting'));
    } finally {
      newsBusyRef.current = false;
      setNewsLoading(false);
    }
  }, [selectedAsset]);

  useEffect(() => {
    loadMarketData();
    const interval = setInterval(async () => {
      try {
        const res = await api.market.getAllPrices();
        if (res?.success) applyPrices(res.data, 'rest');
      } catch {
        /* keep last snapshot */
      }
    }, PRICE_POLL_MS);

    const socket = getSocket();
    const onConnect = () => setSocketLive(true);
    const onDisconnect = () => setSocketLive(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    setSocketLive(socket.connected);

    const offPrices = subscribeSocket('market:prices', (payload) => {
      if (payload?.prices) applyPrices(payload.prices, 'socket');
    });

    return () => {
      clearInterval(interval);
      offPrices();
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [loadMarketData, applyPrices]);

  /** Turbo quote for active chart symbol — freshest header/chart price. */
  useEffect(() => {
    if (!selectedAsset) return undefined;
    let active = true;

    const turbo = async () => {
      try {
        const res = await api.market.getQuote(selectedAsset);
        if (!active || !res?.success || !res.data?.price) return;
        applyPrices({ [selectedAsset]: res.data }, 'turbo');
      } catch {
        /* bulk poll covers fallback */
      }
    };

    turbo();
    const id = setInterval(turbo, TURBO_QUOTE_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [selectedAsset, applyPrices]);

  useEffect(() => {
    loadHeadlineNews();
    const id = setInterval(loadHeadlineNews, NEWS_POLL_MS);
    return () => clearInterval(id);
  }, [loadHeadlineNews]);

  return {
    assetsList,
    prices,
    headlineNews,
    fetchError,
    newsError,
    newsLoading,
    socketLive,
    lastPriceSync,
    lastNewsSync,
    priceSource,
    reloadMarket: loadMarketData,
    reloadNews: loadHeadlineNews,
  };
}
