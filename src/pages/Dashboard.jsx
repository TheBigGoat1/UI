import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api/api.js';
import { AlertTriangle, RefreshCw, Sparkles, ArrowRight } from 'lucide-react';
import TradeChart from '../components/TradeChart';
import MrktTerminalHeader from '../components/dashboard/MrktTerminalHeader';
import MrktChartToolbar from '../components/dashboard/MrktChartToolbar';
import MrktNewsFeed from '../components/dashboard/MrktNewsFeed';
import MrktChartOverlays from '../components/dashboard/MrktChartOverlays';
import InsidrDeskBiasPanel from '../components/dashboard/InsidrDeskBiasPanel.jsx';
import MrktChartEventBadge from '../components/dashboard/MrktChartEventBadge.jsx';
import MrktCandleAnalysisPanel from '../components/dashboard/MrktCandleAnalysisPanel.jsx';
import MrktChartLiveRibbon from '../components/dashboard/MrktChartLiveRibbon.jsx';
import MrktTerminalStatusBar from '../components/dashboard/MrktTerminalStatusBar.jsx';
import SectionErrorBoundary from '../components/SectionErrorBoundary.jsx';
import { formatPrice } from '../utils/displayFormat.js';
import { applyLiveSessionBias } from '../utils/liveSessionBias.js';
import { primaryAssetForNews } from '../utils/newsAssets.js';
import { mapNewsToChartAnnotations, mapCalendarToChartAnnotations, formatChartLabelMeta, computeBarLayout } from '../utils/chartCandleIntel.js';
import { computeChartPriceRange, priceToYPercent, distributeNewsLabelFloats } from '../utils/chartLayout.js';
import { useChartHistory } from '../hooks/useChartHistory.js';
import { useTerminalRealtime } from '../hooks/useTerminalRealtime.js';
import { useAssetAnalysis } from '../hooks/useAssetAnalysis.js';
import { useFeatureAccess } from '../hooks/useFeatureAccess.js';
import { useLayout } from '../context/LayoutContext.jsx';
import { resolveMarketQuote } from '../utils/marketQuote.js';
import { resolveSovereignHeaderQuote } from '../utils/sovereignQuote.js';
import { subscribeSocket } from '../services/realtime/socket.js';

const FEATURE_TOGGLE_MAP = {
  labels: 'chart.labels',
  calendar: 'chart.calendar',
  targets: 'chart.targets',
};

function timeframeToMs(interval = '1h') {
  const iv = String(interval || '1h').toLowerCase();
  if (iv.endsWith('m')) return Math.max(Number.parseInt(iv, 10) * 60_000, 15_000);
  if (iv.endsWith('h')) return Math.max(Number.parseInt(iv, 10) * 3_600_000, 60_000);
  if (iv === '1day' || iv === '1d') return 86_400_000;
  if (iv === '1week' || iv === '1w') return 604_800_000;
  return 3_600_000;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const access = useFeatureAccess();
  const layout = useLayout();
  const showWelcome = searchParams.get('welcome') === '1';
  const checkoutSuccess = searchParams.get('checkout') === 'success';

  const [selectedAsset, setSelectedAsset] = useState('XAUUSD');
  const [chartConfig, setChartConfig] = useState({ interval: '1h', period: '1W' });
  const [brief, setBrief] = useState(null);
  const [selectedNews, setSelectedNews] = useState(null);
  const [deskTab, setDeskTab] = useState('bias');
  const [deskData, setDeskData] = useState(null);
  const [deskLoading, setDeskLoading] = useState(false);
  const [lastDeskSync, setLastDeskSync] = useState(null);
  const [syncAllLoading, setSyncAllLoading] = useState(false);
  const [candlePanelHeadline, setCandlePanelHeadline] = useState(null);
  const [chartCalendarEvents, setChartCalendarEvents] = useState([]);
  const [lastTrustedQuote, setLastTrustedQuote] = useState(null);
  const [toggles, setToggles] = useState({
    labels: true,
    calendar: true,
    targets: true,
  });

  const { chartExpanded, newsOpen, headerCompact, toggleChartExpanded, toggleNewsOpen, toggleHeaderCompact } =
    layout;

  useEffect(() => {
    setToggles((prev) => ({
      labels: access.canLabels ? prev.labels : false,
      calendar: access.canCalendar ? prev.calendar : false,
      targets: access.canTargets ? prev.targets : false,
    }));
  }, [access.canLabels, access.canCalendar, access.canTargets]);

  useEffect(() => {
    if (!selectedAsset || !toggles.calendar) {
      setChartCalendarEvents([]);
      return undefined;
    }
    let active = true;
    api.desk
      .getCalendarForSymbol(selectedAsset)
      .then((res) => {
        if (active && res?.success) setChartCalendarEvents(res.data || []);
      })
      .catch(() => {
        if (active) setChartCalendarEvents([]);
      });
    return () => {
      active = false;
    };
  }, [selectedAsset, toggles.calendar]);

  const {
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
    reloadMarket,
    reloadNews,
  } = useTerminalRealtime(selectedAsset);

  const showStatusBar = false;
  const statusCompact = !fetchError && !newsError && socketLive;

  const dismissWelcome = () => setSearchParams({}, { replace: true });
  const loadMarketData = reloadMarket;

  useEffect(() => {
    const sym = searchParams.get('symbol');
    if (sym) setSelectedAsset(String(sym).toUpperCase());
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    api.trader
      .getWatchlist()
      .then((res) => {
        if (!active || !res?.success || !Array.isArray(res.data) || !res.data.length) return;
        const first = res.data[0].symbol || res.data[0];
        if (first) setSelectedAsset(String(first).toUpperCase());
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    api.brief
      .getDaily()
      .then((res) => {
        if (active && res?.success) setBrief(res.data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setLastTrustedQuote(null);
  }, [selectedAsset]);

  const selectedPrice =
    prices[selectedAsset] ||
    prices[`C:${selectedAsset}`] ||
    prices[selectedAsset?.replace('/', '')];

  const liveTapePatchPrice =
    selectedPrice?.source === 'tradingview' && !selectedPrice?.synthetic && Number(selectedPrice?.price) > 0
      ? Number(selectedPrice.price)
      : lastTrustedQuote?.source === 'tradingview' && Number(lastTrustedQuote?.price) > 0
        ? Number(lastTrustedQuote.price)
        : null;

  const { bars: chartBars, isLiveTape, meta: chartHistoryMeta } = useChartHistory(
    selectedAsset,
    chartConfig.interval,
    chartConfig.period,
    liveTapePatchPrice,
  );

  const analysisState = useAssetAnalysis(
    selectedAsset,
    chartConfig.interval,
    chartConfig.period,
    liveTapePatchPrice,
  );
  const refreshAnalysis = analysisState.refresh;

  const sovereignQuote = useMemo(
    () =>
      resolveSovereignHeaderQuote({
        symbol: selectedAsset,
        priceData: selectedPrice,
        lastTrustedQuote,
        historyBars: chartBars,
        historySynthetic: chartHistoryMeta.synthetic,
        dataQuality: analysisState.meta?.dataQuality,
      }),
    [
      selectedAsset,
      selectedPrice,
      lastTrustedQuote,
      chartBars,
      chartHistoryMeta.synthetic,
      analysisState.meta?.dataQuality,
    ],
  );

  useEffect(() => {
    if (sovereignQuote.state !== 'live' || sovereignQuote.source !== 'tradingview') return;
    if (!sovereignQuote.showPrice || !Number.isFinite(sovereignQuote.price)) return;
    setLastTrustedQuote({
      price: sovereignQuote.price,
      changePercent: sovereignQuote.changePercent,
      source: sovereignQuote.source,
      updatedAt: selectedPrice?.updatedAt || new Date().toISOString(),
    });
  }, [
    sovereignQuote.state,
    sovereignQuote.source,
    sovereignQuote.price,
    sovereignQuote.changePercent,
    sovereignQuote.showPrice,
    selectedPrice?.updatedAt,
  ]);

  const displayQuote = resolveMarketQuote({
    priceData: selectedPrice,
    dataQuality: analysisState.meta?.dataQuality,
    levelsLast: analysisState.technical?.modules?.levels?.last,
    historyBars: chartBars,
  });

  const ms = analysisState.technical?.modules?.marketStructure;
  const swingTrend = ms?.htf?.trend;
  const dayTrend = ms?.ltf?.trend;
  const lv = analysisState.technical?.modules?.levels;

  const headline = useMemo(() => {
    if (headlineNews[0]?.title) {
      const t = headlineNews[0].title;
      return t.length > 100 ? `${t.slice(0, 97)}…` : t;
    }
    if (brief?.veteranLine) return brief.veteranLine;
    if (brief?.regime?.guidance) return brief.regime.guidance;
    return `${selectedAsset} — live desk`;
  }, [headlineNews, brief, selectedAsset]);

  const syncedPrice = sovereignQuote.showPrice ? sovereignQuote.price : null;
  const syncedChangePercent = sovereignQuote.showPrice ? sovereignQuote.changePercent : null;
  const changeAbs = sovereignQuote.showPrice ? sovereignQuote.changeAbs : null;
  const changePercent = syncedChangePercent ?? 0;
  const price = syncedPrice ?? displayQuote.price;
  const chartLastClose = Number(chartBars[chartBars.length - 1]?.close);

  const support = lv?.support ?? (syncedPrice ? Number(syncedPrice) * 0.988 : null);
  const resistance = lv?.resistance ?? (syncedPrice ? Number(syncedPrice) * 1.01 : null);

  const displayAnalysisState = useMemo(() => {
    if (!analysisState.technical) return analysisState;
    const technical = applyLiveSessionBias(analysisState.technical, {
      changePercent,
      ltfTrend: dayTrend,
      htfTrend: swingTrend,
      chartInterval: chartConfig.interval,
      chartPeriod: chartConfig.period,
    });
    return { ...analysisState, technical };
  }, [analysisState, changePercent, dayTrend, swingTrend, chartConfig.interval, chartConfig.period]);

  const marketContext = useMemo(
    () => ({
      symbol: selectedAsset,
      bias: displayAnalysisState.technical?.bias,
      confidence: analysisState.technical?.confidence,
      htfTrend: swingTrend,
      ltfTrend: dayTrend,
      alignment: ms?.alignment,
      support,
      resistance,
      change_pct: changePercent,
      technical_summary: displayAnalysisState.technical?.summary,
      interval: chartConfig.interval,
      period: chartConfig.period,
      timeframe_context: displayAnalysisState.technical?.timeframeContext,
      data_quality: chartHistoryMeta?.synthetic ? 'model' : analysisState.meta?.dataQuality || 'live',
      is_live_tape:
        sovereignQuote.state === 'live' ||
        Boolean(selectedPrice?.source === 'tradingview' && Number(selectedPrice?.price) > 0),
    }),
    [
      selectedAsset,
      displayAnalysisState.technical,
      swingTrend,
      dayTrend,
      ms?.alignment,
      support,
      resistance,
      changePercent,
      chartConfig.interval,
      chartHistoryMeta?.synthetic,
      analysisState.meta?.dataQuality,
      selectedPrice,
      sovereignQuote.state,
      isLiveTape,
    ],
  );

  const mappedCalendarAnnotations = useMemo(
    () =>
      mapCalendarToChartAnnotations(
        chartCalendarEvents,
        chartBars,
        chartConfig.interval,
      ),
    [chartCalendarEvents, chartBars, chartConfig.interval],
  );

  const chartAnnotations = useMemo(() => {
    const timeMapped = mapNewsToChartAnnotations(
      headlineNews,
      chartBars,
      chartConfig.interval,
      selectedAsset,
    );
    if (timeMapped.length) return timeMapped;

    const pool = [];
    if (selectedNews?.title) pool.push(selectedNews);
    headlineNews.forEach((n) => {
      if (!pool.some((p) => p.title === n.title)) pool.push(n);
    });
    if (!pool.length) return [];

    const layout = computeBarLayout(chartBars);
    const range = computeChartPriceRange(chartBars);
    if (!layout?.columns?.length) return [];

    const fallback = pool.slice(0, 8).map((item, i) => {
      const barIdx = Math.min(
        layout.columns.length - 1,
        Math.floor(((i + 1) / (Math.min(pool.length, 8) + 1)) * layout.columns.length),
      );
      const col = layout.columns[barIdx];
      const bar = col.bar;
      const t = new Date(item.publishedAt || item.time).getTime();
      const bullish = Number(bar.close) >= Number(bar.open);
      const side = bullish ? 'above' : 'below';
      const anchorX = col.leftPct;
      const anchorY = priceToYPercent(bullish ? bar.high : bar.low, range.min, range.max);
      return {
        id: `news-fb-${i}-${item.title?.slice(0, 12)}`,
        anchorX,
        anchorY,
        labelX: Math.min(86, anchorX + 10),
        labelY: side === 'above' ? Math.max(8, anchorY - 16) : Math.min(90, anchorY + 16),
        side,
        left: anchorX,
        top: anchorY,
        text: item.title?.length > 140 ? `${item.title.slice(0, 137)}…` : item.title,
        sub: formatChartLabelMeta(t),
        item,
        bar,
      };
    });
    return distributeNewsLabelFloats(fallback, 11);
  }, [headlineNews, selectedNews, chartBars, chartConfig.interval, selectedAsset]);

  const chartLevels = useMemo(() => {
    if (!toggles.targets || support == null || resistance == null) return [];
    return [
      { price: resistance, label: `Target Level: $${Number(resistance).toFixed(2)}`, type: 'target' },
      { price: support, label: `Pullback Area: $${Number(support).toFixed(2)}`, type: 'support' },
    ];
  }, [toggles.targets, resistance, support]);

  const handleUpgradePrompt = useCallback(
    (toggleKey) => {
      const cap = FEATURE_TOGGLE_MAP[toggleKey] || 'chart.labels';
      navigate('/dashboard/pricing', { state: { feature: cap } });
    },
    [navigate],
  );

  const handleNewsSelect = useCallback((item, symbol) => {
    setSelectedNews(item);
    if (symbol) setSelectedAsset(String(symbol).toUpperCase());
    else if (item) setSelectedAsset(primaryAssetForNews(item, selectedAsset));
  }, [selectedAsset]);

  const handleChartMarkerSelect = useCallback(
    (marker) => {
      if (marker?.title || marker?.item?.title) handleNewsSelect(marker.item || marker);
    },
    [handleNewsSelect],
  );

  const buildChartSessionHeadline = useCallback(
    (extra = {}) => {
      const ch = Number(changePercent);
      const chStr = Number.isFinite(ch) ? `${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%` : '';
      const bias = displayAnalysisState.technical?.bias || 'neutral';
      return {
        title:
          extra.title ||
          headlineNews[0]?.title ||
          `Live ${selectedAsset} read — ${chStr} session (${bias})`,
        description:
          extra.description ||
          headlineNews[0]?.description ||
          displayAnalysisState.technical?.summary ||
          `Chart tap analysis for ${selectedAsset} at ${formatPrice(price, selectedAsset)}.`,
        publishedAt: extra.publishedAt || headlineNews[0]?.publishedAt || new Date().toISOString(),
        source: extra.source || 'chart_session',
        ...extra,
      };
    },
    [changePercent, displayAnalysisState.technical, headlineNews, selectedAsset, price],
  );

  const handleCandleAnalysisOpen = useCallback(
    (headline) => {
      const payload = headline?.title ? headline : buildChartSessionHeadline(headline || {});
      handleNewsSelect(payload);
      setCandlePanelHeadline(payload);
    },
    [handleNewsSelect, buildChartSessionHeadline],
  );

  const handleChartTap = useCallback(
    (headline) => {
      handleCandleAnalysisOpen(headline || buildChartSessionHeadline());
    },
    [handleCandleAnalysisOpen, buildChartSessionHeadline],
  );

  const handleSelectAsset = useCallback((sym) => {
    setSelectedAsset(String(sym).toUpperCase());
  }, []);

  const focusDeskCalendar = useCallback(() => {
    setDeskTab('calendar');
    requestAnimationFrame(() => {
      document.querySelector('.mrkt-desk-panel-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const loadDeskIntelligence = useCallback(async () => {
    if (!selectedAsset) return;
    setDeskLoading(true);
    try {
      const [deskRes, briefRes] = await Promise.all([
        api.desk.getIntelligence(selectedAsset),
        api.brief.getDaily().catch(() => null),
      ]);
      if (deskRes?.success) {
        setDeskData(deskRes.data);
        setLastDeskSync(Date.now());
      }
      if (briefRes?.success) setBrief(briefRes.data);
    } catch {
      /* keep last snapshot */
    } finally {
      setDeskLoading(false);
    }
  }, [selectedAsset]);

  const handleSyncAll = useCallback(async () => {
    setSyncAllLoading(true);
    try {
      await Promise.all([
        reloadMarket(),
        reloadNews(),
        loadDeskIntelligence(),
        refreshAnalysis?.({ silent: true }),
      ]);
    } finally {
      setSyncAllLoading(false);
    }
  }, [reloadMarket, reloadNews, loadDeskIntelligence, refreshAnalysis]);

  const lastTapeRefresh = useRef(0);
  const lastTapeRefreshAt = useRef(0);
  useEffect(() => {
    const ch = Number(changePercent);
    const now = Date.now();
    // Avoid rapid analysis recompute jitter from tiny tape moves.
    if (
      !Number.isFinite(ch) ||
      Math.abs(ch - lastTapeRefresh.current) < 0.2 ||
      now - lastTapeRefreshAt.current < 4000
    ) {
      return undefined;
    }
    lastTapeRefresh.current = ch;
    lastTapeRefreshAt.current = now;
    const t = setTimeout(() => refreshAnalysis?.({ silent: true }), 1200);
    return () => clearTimeout(t);
  }, [changePercent, selectedAsset, refreshAnalysis]);

  useEffect(() => {
    loadDeskIntelligence();
    const deskCadenceMs = timeframeToMs(chartConfig.interval);
    const id = setInterval(loadDeskIntelligence, deskCadenceMs);
    const offDesk = subscribeSocket('desk:snapshot', (payload) => {
      if (payload?.data) {
        setDeskData(payload.data);
        setLastDeskSync(Date.now());
      }
    });
    return () => {
      clearInterval(id);
      offDesk();
    };
  }, [loadDeskIntelligence, chartConfig.interval]);

  useEffect(() => {
    const analysisCadenceMs = Math.max(timeframeToMs(chartConfig.interval), 120000);
    const id = setInterval(() => refreshAnalysis?.({ silent: true }), analysisCadenceMs);
    return () => clearInterval(id);
  }, [refreshAnalysis, chartConfig.interval, selectedAsset]);

  const chartIsModel = !sovereignQuote.showPrice && displayQuote.isModel;
  const chartIsLive = sovereignQuote.state === 'live' && sovereignQuote.source === 'tradingview';
  const overlayPrice = syncedPrice;
  const quoteDriftPct =
    Number.isFinite(chartLastClose) &&
    Number.isFinite(Number(overlayPrice)) &&
    Number(overlayPrice) > 0
      ? (Math.abs(chartLastClose - Number(overlayPrice)) / Number(overlayPrice)) * 100
      : null;
  const decisionUnsafe =
    sovereignQuote.state !== 'live' || (quoteDriftPct != null && quoteDriftPct > 12);

  const handleCalendarEventInsight = useCallback(() => {
    setDeskTab('calendar');
    requestAnimationFrame(() => {
      document.querySelector('.mrkt-desk-panel-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        document.querySelector('.desk-home-cal')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 280);
    });
  }, []);

  const terminalClass = [
    'mrkt-terminal',
    chartExpanded ? 'mrkt-terminal--chart-expanded' : '',
    headerCompact ? 'mrkt-terminal--header-compact' : '',
    !newsOpen ? 'mrkt-terminal--news-hidden' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={terminalClass}>
      {fetchError && (
        <div className="dash-empty-banner mrkt-terminal__banner shrink-0" role="alert">
          <span className="flex items-center gap-2">
            <AlertTriangle size={16} />
            {fetchError}
          </span>
          <button type="button" onClick={loadMarketData} className="btn-primary text-xs py-1.5 px-3">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {showWelcome && (
        <div className="mrkt-welcome mrkt-terminal__banner shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={16} className="text-[var(--accent,#22d3ee)] shrink-0" />
            <p className="text-xs text-white font-semibold">
              {checkoutSuccess ? 'Welcome — your plan is active' : 'Your desk is ready'}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={dismissWelcome} className="mrkt-welcome__dismiss">
              Dismiss
            </button>
            <Link to="/dashboard/ideas" className="mrkt-welcome__link">
              Ideas <ArrowRight size={10} />
            </Link>
          </div>
        </div>
      )}

        {!headerCompact && (
        <MrktTerminalHeader
          headline={headline}
          symbol={selectedAsset}
          price={syncedPrice}
          changeAbs={changeAbs}
          changePercent={syncedChangePercent}
          isLive={chartIsLive}
          tapeState={sovereignQuote.state}
          priceSource={sovereignQuote.source || selectedPrice?.source || priceSource}
          swingTrend={swingTrend}
          dayTrend={dayTrend}
          chartInterval={chartConfig.interval}
          chartPeriod={chartConfig.period}
          timeframe={analysisState.timeframe}
        />
      )}

      {showStatusBar && (
      <MrktTerminalStatusBar
        compact={statusCompact}
        socketLive={socketLive}
        lastPriceSync={lastPriceSync}
        lastNewsSync={lastNewsSync}
        lastChartSync={chartHistoryMeta.asOf}
        lastDeskSync={lastDeskSync}
        priceSource={priceSource}
        chartLive={chartIsLive}
        quoteDriftPct={quoteDriftPct}
        decisionUnsafe={decisionUnsafe}
        newsError={newsError}
        onRefresh={handleSyncAll}
        refreshing={syncAllLoading || deskLoading}
      />
      )}

      {headerCompact && (
        <div className="mrkt-terminal__header-compact">
          <p className="mrkt-terminal__header-compact-headline">{headline}</p>
          <button type="button" className="mrkt-desk-controls__btn" onClick={toggleHeaderCompact}>
            Show full header
          </button>
        </div>
      )}

      <div className="mrkt-terminal__workspace">
        <div className="mrkt-terminal__chart-col">
          <div className="mrkt-chart-viewport">
            <MrktChartToolbar
              symbol={selectedAsset}
              interval={chartConfig.interval}
              onTimeframeChange={(interval, period) => setChartConfig({ interval, period })}
              assets={assetsList}
              prices={prices}
              onSymbolChange={setSelectedAsset}
              toggles={toggles}
              onToggle={(key) => setToggles((p) => ({ ...p, [key]: !p[key] }))}
              newsOpen={newsOpen}
              onNewsToggle={toggleNewsOpen}
              access={access}
              onUpgrade={handleUpgradePrompt}
              layout={{
                chartExpanded,
                newsOpen,
                headerCompact,
                onToggleChart: toggleChartExpanded,
                onToggleNews: toggleNewsOpen,
                onToggleHeader: toggleHeaderCompact,
              }}
              status={{
                socketLive,
                lastPriceSync,
                lastNewsSync,
                chartLive:
                  sovereignQuote.state === 'live' ||
                  Boolean(selectedPrice?.source === 'tradingview' && Number(selectedPrice?.price) > 0),
                quoteDriftPct,
                onRefresh: handleSyncAll,
                refreshing: syncAllLoading || deskLoading,
              }}
            />

            <div className="mrkt-chart-main">
              <div className="mrkt-chart-workspace">
              <div className="mrkt-chart-stage">
                <div className="dash-chart-zone dash-chart-zone--analysis-tap">
                  {selectedAsset ? (
                    <>
                      <MrktChartLiveRibbon
                        bias={displayAnalysisState.technical?.bias}
                        isLive={chartIsLive}
                        interval={chartConfig.interval}
                        period={chartConfig.period}
                      />
                      <TradeChart
                        key={`${selectedAsset}-${chartConfig.interval}`}
                        symbol={selectedAsset}
                        interval={chartConfig.interval}
                        levels={[]}
                        fill
                        interactive
                        modelMode={false}
                        quotePrice={liveTapePatchPrice}
                      />
                      <MrktChartOverlays
                        showLabels={toggles.labels && access.canLabels}
                        showTargets={toggles.targets && access.canTargets}
                        showCalendarEvents={toggles.calendar && access.canCalendar}
                        price={overlayPrice}
                        support={support ?? price}
                        resistance={resistance ?? price}
                        symbol={selectedAsset}
                        annotations={chartAnnotations}
                        calendarEvents={mappedCalendarAnnotations}
                        chartBars={chartBars}
                        chartInterval={chartConfig.interval}
                        newsPool={headlineNews}
                        isLiveTape={chartIsLive}
                        onMarkerSelect={handleChartMarkerSelect}
                        onCandleOpen={handleCandleAnalysisOpen}
                        onChartTap={handleChartTap}
                        candleAnalysisOpen={Boolean(candlePanelHeadline)}
                      />
                      {chartHistoryMeta.synthetic && chartBars.length >= 2 && !chartIsLive && (
                        <div className="mrkt-chart-data-badge mrkt-chart-data-badge--history" role="status">
                          History: {chartHistoryMeta.source} — last sync{' '}
                          {chartHistoryMeta.asOf
                            ? new Date(chartHistoryMeta.asOf).toLocaleTimeString()
                            : '—'}
                        </div>
                      )}
                      {chartIsModel && !chartIsLive && (
                        <div className="mrkt-chart-data-badge" role="status">
                          Awaiting live quote — showing model structure until tape connects
                        </div>
                      )}
                      {toggles.calendar && access.canCalendar && (
                        <MrktChartEventBadge symbol={selectedAsset} onClick={focusDeskCalendar} />
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-text-muted text-sm">
                      Select an instrument
                    </div>
                  )}
                </div>
              </div>

              </div>
            </div>

          </div>

          <div className="mrkt-desk-panel-wrap">
            <SectionErrorBoundary
              title="Desk panel error"
              message="Desk intelligence failed to load. Sync all or switch tabs to retry."
            >
            <InsidrDeskBiasPanel
              symbol={selectedAsset}
              selectedNews={selectedNews}
              analysisState={displayAnalysisState}
              prices={prices}
              brief={brief}
              newsPool={headlineNews}
              changePercent={changePercent}
              activeTab={deskTab}
              onTabChange={setDeskTab}
              deskData={deskData}
              deskLoading={deskLoading}
              onDeskRefresh={loadDeskIntelligence}
              onCalendarEventInsight={handleCalendarEventInsight}
              onSelectAsset={handleSelectAsset}
              onNewsSelect={handleNewsSelect}
              chartInterval={chartConfig.interval}
              chartPeriod={chartConfig.period}
            />
            </SectionErrorBoundary>
          </div>
        </div>

        {candlePanelHeadline && (
          <MrktCandleAnalysisPanel
            className="mrkt-candle-drawer--overlay"
            symbol={selectedAsset}
            headline={candlePanelHeadline}
            marketContext={marketContext}
            relatedNewsPool={headlineNews}
            prices={prices}
            canAiInsight={access.canNewsAi}
            onClose={() => setCandlePanelHeadline(null)}
            onSelectAsset={handleSelectAsset}
          />
        )}

        {newsOpen && (
          <SectionErrorBoundary
            title="News feed error"
            message="The news column hit an error. Retry sync or open the full news page."
          >
          <MrktNewsFeed
            asset={selectedAsset}
            wireItems={headlineNews}
            wireLoading={newsLoading}
            onWireSync={reloadNews}
            canAiInsight={access.canNewsAi}
            onUpgrade={handleUpgradePrompt}
            onSelectAsset={handleSelectAsset}
            selectedNews={selectedNews}
            onNewsSelect={handleNewsSelect}
            marketContext={marketContext}
            prices={prices}
            newsError={newsError}
            onNewsRefresh={reloadNews}
          />
          </SectionErrorBoundary>
        )}
      </div>

    </div>
  );
};

export default Dashboard;
