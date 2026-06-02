import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api/api.js';
import { AlertTriangle, RefreshCw, Sparkles, ArrowRight } from 'lucide-react';
import TradeChart from '../components/TradeChart';
import MrktTerminalHeader from '../components/dashboard/MrktTerminalHeader';
import MrktChartToolbar from '../components/dashboard/MrktChartToolbar';
import MrktNewsFeed from '../components/dashboard/MrktNewsFeed';
import MrktChartOverlays from '../components/dashboard/MrktChartOverlays';
import MrktAssetPicker from '../components/dashboard/MrktAssetPicker';
import InsidrDeskBiasPanel from '../components/dashboard/InsidrDeskBiasPanel.jsx';
import MrktChartEventBadge from '../components/dashboard/MrktChartEventBadge.jsx';
import MrktCandleAnalysisPanel from '../components/dashboard/MrktCandleAnalysisPanel.jsx';
import MrktChartLiveRibbon from '../components/dashboard/MrktChartLiveRibbon.jsx';
import { applyLiveSessionBias } from '../utils/liveSessionBias.js';
import { primaryAssetForNews } from '../utils/newsAssets.js';
import { useAssetAnalysis } from '../hooks/useAssetAnalysis.js';
import { useFeatureAccess } from '../hooks/useFeatureAccess.js';
import { useLayout } from '../context/LayoutContext.jsx';
import { resolveMarketQuote } from '../utils/marketQuote.js';
import { subscribeSocket } from '../services/realtime/socket.js';
import { applyDeskPriceAliases } from '../utils/deskSymbols.js';

const FEATURE_TOGGLE_MAP = {
  labels: 'chart.labels',
  calendar: 'chart.calendar',
  targets: 'chart.targets',
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const access = useFeatureAccess();
  const layout = useLayout();
  const showWelcome = searchParams.get('welcome') === '1';
  const checkoutSuccess = searchParams.get('checkout') === 'success';

  const [assetsList, setAssetsList] = useState([]);
  const [prices, setPrices] = useState({});
  const [selectedAsset, setSelectedAsset] = useState('XAUUSD');
  const [chartConfig, setChartConfig] = useState({ interval: '1h', period: '1W' });
  const [brief, setBrief] = useState(null);
  const [headlineNews, setHeadlineNews] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [deskTab, setDeskTab] = useState('bias');
  const [deskData, setDeskData] = useState(null);
  const [deskLoading, setDeskLoading] = useState(false);
  const [candlePanelHeadline, setCandlePanelHeadline] = useState(null);
  const [chartCalendarEvents, setChartCalendarEvents] = useState([]);
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
    if (!selectedAsset || !toggles.calendar) return undefined;
    let active = true;
    const from = new Date();
    const to = new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000);
    api.calendar
      .getEvents({
        from: from.toISOString(),
        to: to.toISOString(),
        country: 'US',
        importance: 'HIGH',
        limit: 20,
      })
      .then((res) => {
        if (active && res?.success) setChartCalendarEvents(res.data || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedAsset, toggles.calendar]);

  const dismissWelcome = () => setSearchParams({}, { replace: true });

  const loadMarketData = async () => {
    setFetchError(null);
    try {
      const [listRes, pricesRes] = await Promise.all([
        api.market.getAssetsList(),
        api.market.getAllPrices(),
      ]);
      if (listRes?.success && Array.isArray(listRes.data) && listRes.data.length) {
        setAssetsList(listRes.data);
      }
      if (pricesRes?.success && pricesRes.data) setPrices(applyDeskPriceAliases(pricesRes.data));
      if (!pricesRes?.success || !Object.keys(pricesRes?.data || {}).length) {
        setFetchError('Market prices unavailable. Run: npm run dev:all');
      }
    } catch {
      setFetchError('Cannot reach API. Run: npm run dev:all');
    }
  };

  useEffect(() => {
    loadMarketData();
    const interval = setInterval(async () => {
      try {
        const res = await api.market.getAllPrices();
        if (res?.success) setPrices(applyDeskPriceAliases(res.data));
      } catch {
        /* keep last snapshot */
      }
    }, 2500);
    const offPrices = subscribeSocket('market:prices', (payload) => {
      if (payload?.prices) setPrices(applyDeskPriceAliases(payload.prices));
    });
    return () => {
      clearInterval(interval);
      offPrices();
    };
  }, []);

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
    let active = true;
    api.news
      .getByAssetPath(selectedAsset, { page: 1, limit: 8 })
      .then((res) => {
        if (active && res?.data?.length) setHeadlineNews(res.data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedAsset]);

  const selectedPrice =
    prices[selectedAsset] ||
    prices[`C:${selectedAsset}`] ||
    prices[selectedAsset?.replace('/', '')];

  const analysisState = useAssetAnalysis(
    selectedAsset,
    chartConfig.interval,
    chartConfig.period,
    selectedPrice?.price,
  );

  const displayQuote = resolveMarketQuote({
    priceData: selectedPrice,
    dataQuality: analysisState.meta?.dataQuality,
    levelsLast: analysisState.technical?.modules?.levels?.last,
    historyBars: [],
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

  const changePercent = displayQuote.changePercent ?? selectedPrice?.changePercent ?? 0;
  const price = displayQuote.price ?? selectedPrice?.price;
  const changeAbs =
    price != null && changePercent != null
      ? (Number(price) * Number(changePercent)) / 100
      : null;

  const support = lv?.support ?? (price ? Number(price) * 0.988 : null);
  const resistance = lv?.resistance ?? (price ? Number(price) * 1.01 : null);

  const displayAnalysisState = useMemo(() => {
    if (!analysisState.technical) return analysisState;
    const technical = applyLiveSessionBias(analysisState.technical, {
      changePercent,
      ltfTrend: dayTrend,
      htfTrend: swingTrend,
    });
    return { ...analysisState, technical };
  }, [analysisState, changePercent, dayTrend, swingTrend]);

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
    ],
  );

  const chartAnnotations = useMemo(() => {
    const pool = [];
    if (selectedNews?.title) pool.push(selectedNews);
    headlineNews.forEach((n) => {
      if (!pool.some((p) => p.title === n.title)) pool.push(n);
    });
    if (!pool.length) return [];
    const positions = [
      { left: 24, top: 28 },
      { left: 42, top: 48 },
      { left: 58, top: 35 },
      { left: 72, top: 55 },
      { left: 82, top: 40 },
    ];
    return pool.slice(0, 5).map((item, i) => {
      const pos = positions[i % positions.length];
      return {
        id: `news-${i}-${item.title?.slice(0, 12)}`,
        left: pos.left,
        top: pos.top,
        text: item.title?.length > 90 ? `${item.title.slice(0, 87)}…` : item.title,
        sub: new Date(item.publishedAt || item.time).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
        item,
      };
    });
  }, [headlineNews, selectedNews]);

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
          `Chart tap analysis for ${selectedAsset} at ${price != null ? Number(price).toFixed(2) : '—'}.`,
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
      if (deskRes?.success) setDeskData(deskRes.data);
      if (briefRes?.success) setBrief(briefRes.data);
    } catch {
      /* keep last snapshot */
    } finally {
      setDeskLoading(false);
    }
  }, [selectedAsset]);

  const lastTapeRefresh = useRef(0);
  useEffect(() => {
    const ch = Number(changePercent);
    if (!Number.isFinite(ch) || Math.abs(ch - lastTapeRefresh.current) < 0.06) return undefined;
    lastTapeRefresh.current = ch;
    const t = setTimeout(() => analysisState.refresh?.(), 600);
    return () => clearTimeout(t);
  }, [changePercent, selectedAsset]);

  useEffect(() => {
    loadDeskIntelligence();
    const id = setInterval(loadDeskIntelligence, 30000);
    const offDesk = subscribeSocket('desk:snapshot', (payload) => {
      if (payload?.data) setDeskData(payload.data);
    });
    return () => {
      clearInterval(id);
      offDesk();
    };
  }, [loadDeskIntelligence]);

  const chartIsModel = !selectedPrice?.price && displayQuote.isModel;
  const chartIsLive = Boolean(selectedPrice?.price) && !selectedPrice?.synthetic;

  const handleCalendarEventInsight = useCallback(() => {
    setDeskTab('calendar');
    requestAnimationFrame(() => {
      document.querySelector('.desk-home-cal')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            <Sparkles size={16} className="text-[#8b5cf6] shrink-0" />
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
          price={price}
          changeAbs={changeAbs}
          changePercent={changePercent}
          swingTrend={swingTrend}
          dayTrend={dayTrend}
        />
      )}

      {headerCompact && (
        <div className="mrkt-terminal__header-compact">
          <p className="mrkt-terminal__header-compact-headline">{headline}</p>
          <span className="mrkt-terminal__header-compact-price">{price != null ? Number(price).toFixed(2) : '—'}</span>
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
              onAssetPicker={() => setPickerOpen(true)}
              onAddSymbol={() => setPickerOpen(true)}
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
            />

            <div
              className={`mrkt-chart-main ${candlePanelHeadline ? 'mrkt-chart-main--with-drawer' : ''}`}
            >
              <div className="mrkt-chart-workspace">
              <div
                className={`mrkt-chart-stage ${candlePanelHeadline ? 'mrkt-chart-stage--narrow' : ''}`}
              >
                <div className="dash-chart-zone dash-chart-zone--analysis-tap">
                  {selectedAsset ? (
                    <>
                      <MrktChartLiveRibbon
                        symbol={selectedAsset}
                        price={price}
                        changePercent={changePercent}
                        bias={displayAnalysisState.technical?.bias}
                        isLive={chartIsLive}
                        interval={chartConfig.interval}
                      />
                      <TradeChart
                        key={`${selectedAsset}-${chartConfig.interval}`}
                        symbol={selectedAsset}
                        interval={chartConfig.interval}
                        levels={chartLevels}
                        fill
                        interactive
                        modelMode={displayQuote.isModel}
                        quotePrice={displayQuote.price}
                      />
                      <MrktChartOverlays
                        showLabels={toggles.labels && access.canLabels}
                        showTargets={toggles.targets && access.canTargets}
                        showCalendarEvents={toggles.calendar && access.canCalendar}
                        price={price}
                        support={support ?? price}
                        resistance={resistance ?? price}
                        symbol={selectedAsset}
                        annotations={chartAnnotations}
                        calendarEvents={chartCalendarEvents}
                        onMarkerSelect={handleChartMarkerSelect}
                        onCandleOpen={handleCandleAnalysisOpen}
                        onChartTap={handleChartTap}
                        candleAnalysisOpen={Boolean(candlePanelHeadline)}
                      />
                      {chartIsModel && (
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

              {candlePanelHeadline && (
                <MrktCandleAnalysisPanel
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
              </div>
            </div>

          </div>

          <div className="mrkt-desk-panel-wrap">
            <InsidrDeskBiasPanel
              symbol={selectedAsset}
              selectedNews={selectedNews}
              analysisState={displayAnalysisState}
              prices={prices}
              brief={brief}
              activeTab={deskTab}
              onTabChange={setDeskTab}
              deskData={deskData}
              deskLoading={deskLoading}
              onDeskRefresh={loadDeskIntelligence}
              onCalendarEventInsight={handleCalendarEventInsight}
              onSelectAsset={handleSelectAsset}
            />
          </div>
        </div>

        {newsOpen && (
          <MrktNewsFeed
            asset={selectedAsset}
            canAiInsight={access.canNewsAi}
            onUpgrade={handleUpgradePrompt}
            onSelectAsset={handleSelectAsset}
            selectedNews={selectedNews}
            onNewsSelect={handleNewsSelect}
            marketContext={marketContext}
            prices={prices}
          />
        )}
      </div>

      {pickerOpen && (
        <MrktAssetPicker
          assets={assetsList}
          prices={prices}
          selected={selectedAsset}
          onSelect={setSelectedAsset}
          onClose={() => setPickerOpen(false)}
        />
      )}

    </div>
  );
};

export default Dashboard;
