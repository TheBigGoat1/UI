import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import {
  isTradingViewSupportedAsset,
  toTradingViewInterval,
  toTradingViewSymbol,
} from '../utils/tradingView.js';
import { api } from '../services/api/api.js';
import {
  buildClientSyntheticHistory,
  normalizeOhlcRows,
} from '../utils/chartConfig.js';
import OhlcVisualChart from './OhlcVisualChart.jsx';

const TV_SCRIPT = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';

function formatLevelPrice(price) {
  const n = parseFloat(price);
  if (Number.isNaN(n)) return null;
  if (n >= 1000) return n.toFixed(2);
  if (n >= 10) return n.toFixed(4);
  return n.toFixed(5);
}

function mountTradingViewWidget(container, options) {
  container.innerHTML = '';
  const outer = document.createElement('div');
  outer.className = 'tradingview-widget-container';
  outer.style.cssText = 'height:100%;width:100%;min-height:100%;';

  const widget = document.createElement('div');
  widget.className = 'tradingview-widget-container__widget';
  widget.style.cssText = 'height:100%;width:100%;min-height:100%;';

  const script = document.createElement('script');
  script.src = TV_SCRIPT;
  script.type = 'text/javascript';
  script.async = true;
  script.innerHTML = JSON.stringify(options);

  outer.appendChild(widget);
  outer.appendChild(script);
  container.appendChild(outer);
  return outer;
}

function hasTvIframe(container) {
  if (!container) return false;
  return Boolean(
    container.querySelector('iframe') ||
      container.querySelector('.tradingview-widget-container__widget iframe'),
  );
}

const TradingViewChart = ({
  symbol,
  data,
  interval = '4h',
  height = 400,
  interactive = true,
  compact = false,
  levels = [],
  modelMode = false,
  quotePrice = null,
  preferDataFeed = false,
  className = '',
  onReady,
}) => {
  const containerRef = useRef(null);
  const { isDark } = useTheme();
  const [bars, setBars] = useState([]);
  const [tvReady, setTvReady] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [loading, setLoading] = useState(true);

  const tvSymbol = toTradingViewSymbol(symbol);
  const tvSupported = isTradingViewSupportedAsset(symbol);
  const tvInterval = toTradingViewInterval(interval);
  const pxHeight = Math.max(compact ? 128 : 280, Number(height) || 400);
  const hasProvidedBars = Array.isArray(data) && data.length > 0;

  useEffect(() => {
    if (!symbol) return undefined;
    if (hasProvidedBars) {
      setBars(normalizeOhlcRows(data));
      setLoading(false);
      return undefined;
    }
    let active = true;
    const range = compact ? '1W' : '1M';
    const seedPrice = modelMode && Number.isFinite(Number(quotePrice)) ? Number(quotePrice) : undefined;

    setBars(
      normalizeOhlcRows(buildClientSyntheticHistory(symbol, interval, range, seedPrice)),
    );

    if (modelMode) return undefined;

    (async () => {
      try {
        const res = await api.market.getHistory(symbol, interval, range);
        if (!active) return;
        let rows =
          res?.success && Array.isArray(res.data) ? normalizeOhlcRows(res.data) : [];
        if (rows.length < 5) {
          rows = normalizeOhlcRows(buildClientSyntheticHistory(symbol, interval, range, seedPrice));
        }
        setBars(rows);
      } catch {
        if (active) {
          setBars(
            normalizeOhlcRows(buildClientSyntheticHistory(symbol, interval, range, seedPrice)),
          );
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [symbol, interval, compact, modelMode, quotePrice, data, hasProvidedBars]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !symbol || preferDataFeed || !tvSupported) return undefined;

    setTvReady(false);
    setUseFallback(false);
    setLoading(true);

    const bg = isDark ? '#131722' : '#ffffff';

    const mountTimer = window.setTimeout(() => {
      mountTradingViewWidget(el, {
        autosize: true,
        width: '100%',
        symbol: tvSymbol,
        interval: tvInterval,
        timezone: 'Etc/UTC',
        theme: isDark ? 'dark' : 'light',
        style: '1',
        locale: 'en',
        enable_publishing: false,
        allow_symbol_change: false,
        hide_top_toolbar: compact || !interactive,
        hide_side_toolbar: compact || !interactive,
        hide_legend: compact,
        hide_volume: compact,
        withdateranges: interactive && !compact,
        save_image: false,
        calendar: false,
        support_host: 'https://www.tradingview.com',
        backgroundColor: bg,
        gridColor: isDark ? 'rgba(39, 39, 42, 0.8)' : 'rgba(0, 0, 0, 0.08)',
      });
    }, 50);

    const checkTimer = window.setInterval(() => {
      if (hasTvIframe(el)) {
        setTvReady(true);
        setUseFallback(false);
        setLoading(false);
        onReady?.();
        window.clearInterval(checkTimer);
      }
    }, 400);

    const fallbackTimer = window.setTimeout(() => {
      window.clearInterval(checkTimer);
      if (!hasTvIframe(el)) {
        setUseFallback(true);
        setTvReady(false);
      }
      setLoading(false);
    }, 4500);

    return () => {
      window.clearTimeout(mountTimer);
      window.clearTimeout(fallbackTimer);
      window.clearInterval(checkTimer);
      if (el) el.innerHTML = '';
    };
  }, [symbol, tvSymbol, tvInterval, isDark, interactive, compact, onReady, preferDataFeed, tvSupported]);

  if (!symbol) {
    return (
      <div
        className={`tradingview-chart-mount tradingview-chart-mount--empty ${className}`}
        style={{ height: pxHeight }}
      >
        <p className="text-sm text-text-muted">Select a symbol for chart</p>
      </div>
    );
  }

  const visibleLevels = (levels || []).filter((l) => formatLevelPrice(l.price) != null);
  const hasBars = bars.length > 0;
  const showFallbackBars =
    hasBars && (modelMode || useFallback || !tvReady || preferDataFeed || !tvSupported);

  return (
    <div
      className={`tradingview-chart-wrap ${className}`}
      style={{ height: pxHeight, minHeight: pxHeight }}
    >
      {showFallbackBars && (
        <OhlcVisualChart
          data={bars}
          height={pxHeight}
          symbol={symbol}
          className="ohlc-visual--layer"
        />
      )}

      {!preferDataFeed && !useFallback && tvSupported && (
        <div
          ref={containerRef}
          className={`tradingview-chart-mount ${
            tvReady ? 'tradingview-chart-mount--overlay' : 'tradingview-chart-mount--preload'
          }`}
          style={{ height: pxHeight, minHeight: pxHeight }}
        />
      )}

      {loading && !hasBars && (
        <div className="tradingview-chart-mount__loader" aria-hidden="true">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-text-muted mt-2">Loading chart…</span>
        </div>
      )}

      {(modelMode || useFallback || (!tvReady && hasBars && !preferDataFeed) || !tvSupported) && (
        <span className={`ohlc-visual__badge ${modelMode ? 'ohlc-visual__badge--model' : ''}`}>
          {modelMode
            ? 'Model candles · TV shows live broker data'
              : useFallback
              ? 'Live candles · open TradingView for full tools'
              : !tvSupported
                ? 'Live fallback candles · TV symbol unavailable'
                : 'Loading TradingView…'}
        </span>
      )}

      {visibleLevels.length > 0 && (
        <div className="tv-levels-overlay" aria-label="Trade levels">
          {visibleLevels.map((level) => {
            const price = formatLevelPrice(level.price);
            const labelLower = (level.label || '').toLowerCase();
            const isStop =
              level.type === 'RESISTANCE' || level.type === 'support' || labelLower.includes('pullback');
            const isTarget =
              level.type === 'target' || labelLower.includes('target');
            return (
              <span
                key={`${level.label}-${price}`}
                className={`tv-level-pill ${
                  isStop ? 'tv-level-pill--stop' : isTarget ? 'tv-level-pill--target' : 'tv-level-pill--entry'
                }`}
              >
                {level.label || level.type}: {price}
              </span>
            );
          })}
        </div>
      )}

      {compact && (
        <a
          className="tv-brand-ribbon"
          href={`https://www.tradingview.com/symbols/${tvSymbol.replace(':', '-')}/`}
          target="_blank"
          rel="noopener noreferrer"
          title="Open on TradingView"
        >
          TV
        </a>
      )}
    </div>
  );
};

export default TradingViewChart;
