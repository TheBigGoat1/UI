import React, { useEffect, useState } from "react";
import { api } from "../services/api/api.js";

import {
  Activity,
  ArrowRight,
  Server,
  WifiIcon,
  Info,
  Globe,
  Zap,
  BarChart2,
  Clock,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader";
import DashSelect from "../components/ui/DashSelect.jsx";
import DashStat from "../components/dashboard/DashStat";
import DashPanel from "../components/dashboard/DashPanel";
import AssetGrid from "../components/dashboard/AssetGrid";
import AssetAnalysisPanel from "../components/dashboard/AssetAnalysisPanel";
import TradeChart from "../components/TradeChart";
import { useAuth } from "../context/AuthContext";
import { useAssetAnalysis } from "../hooks/useAssetAnalysis.js";
import { resolveMarketQuote } from "../utils/marketQuote.js";
import {
  CHART_INTERVALS,
  CHART_PERIODS,
  DEFAULT_CHART,
  normalizeOhlcRows,
  buildClientSyntheticHistory,
  periodToInterval,
} from "../utils/chartConfig.js";
import { subscribeSocket } from "../services/realtime/socket.js";
import DailyBriefPanel from "../components/brief/DailyBriefPanel";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // -- STATE --
  const [assetsList, setAssetsList] = useState([]);
  const [prices, setPrices] = useState({});
  const [selectedAsset, setSelectedAsset] = useState("EURUSD");
  const [viewAllAssets, setViewAllAssets] = useState(false);

  // Detailed Data State
  const [assetHistory, setAssetHistory] = useState([]);
  const [isChartLoading, setIsChartLoading] = useState(false);

  // Chart & Global State
  const [chartConfig, setChartConfig] = useState({ ...DEFAULT_CHART });
  const [risk, setRisk] = useState(null);
  const [systemStatus, setSystemStatus] = useState({ online: false });
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(true);


  // --- TIME FILTER ---
  const filterDataByTime = (data, period) => {
    if (!data || data.length === 0) return [];
    const timestamps = data.map((d) => d.time).filter((t) => Number.isFinite(t));
    if (timestamps.length < 2) return data;
    const latestTimestamp = Math.max(...timestamps);
    const durationSeconds = {
      "1D": 24 * 60 * 60,
      "1W": 7 * 24 * 60 * 60,
      "1M": 30 * 24 * 60 * 60,
      "3M": 90 * 24 * 60 * 60,
      "1Y": 365 * 24 * 60 * 60,
    };
    const duration = durationSeconds[period] || 30 * 24 * 60 * 60;
    const cutoffTime = latestTimestamp - duration;
    const trimmed = data.filter((d) => d.time >= cutoffTime);
    return trimmed.length >= 2 ? trimmed : data;
  };

  const loadMarketData = async () => {
    setFetchError(null);
    try {
      const [healthRes, riskRes, listRes, pricesRes, portfolioRes] = await Promise.all([
        api.system.getHealth(),
        api.analysis.getRiskEnvironment(),
        api.market.getAssetsList(),
        api.market.getAllPrices(),
        api.portfolio.getLiveStats().catch(() => ({ success: false })),
      ]);

      setSystemStatus({ online: healthRes?.success !== false });
      if (riskRes?.success) setRisk(riskRes.data);
      if (pricesRes?.success && pricesRes.data) setPrices(pricesRes.data);

      if (listRes?.success && Array.isArray(listRes.data) && listRes.data.length) {
        setAssetsList(listRes.data);
      }

      if (portfolioRes?.success && portfolioRes.data) setPortfolio(portfolioRes.data);

      if (!pricesRes?.success || !pricesRes?.data || !Object.keys(pricesRes.data).length) {
        setFetchError("Market prices unavailable. Is the API running on port 3001?");
      }
    } catch {
      setSystemStatus({ online: false });
      setFetchError("Cannot reach API. Run: npm run dev:all");
    } finally {
      setIsGlobalLoading(false);
    }
  };

  // -- DATA FETCHING --
  useEffect(() => {
    loadMarketData();
    const interval = setInterval(async () => {
      const res = await api.market.getAllPrices();
      if (res.success) setPrices(res.data);
    }, 5000);
    const offPrices = subscribeSocket("market:prices", (payload) => {
      if (payload?.prices) setPrices(payload.prices);
    });
    const offRealtime = subscribeSocket("realtime:status", () => {
      setSystemStatus((prev) => ({ ...prev, online: true }));
    });
    return () => {
      clearInterval(interval);
      offPrices();
      offRealtime();
    };
  }, []);

  useEffect(() => {
    let active = true;
    api.brief
      .getDaily()
      .then((res) => {
        if (active && res?.success) setBrief(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setBriefLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // -- DETAILED ASSET FETCH --
  useEffect(() => {
    if (!selectedAsset) return;

    const controller = new AbortController();
    setIsChartLoading(true);
    setAssetHistory([]);

    const fetchDetails = async () => {
      const basePrice = prices[selectedAsset]?.price;

      const [historyRes] = await Promise.all([
        api.market.getHistory(
          selectedAsset,
          chartConfig.interval,
          chartConfig.period,
        ),
      ]);

      if (controller.signal.aborted) return;

      let normalizedData = [];
      if (historyRes?.success && Array.isArray(historyRes.data)) {
        normalizedData = normalizeOhlcRows(historyRes.data);
      }
      if (normalizedData.length < 2) {
        normalizedData = normalizeOhlcRows(
          buildClientSyntheticHistory(
            selectedAsset,
            chartConfig.interval,
            chartConfig.period,
            basePrice,
          ),
        );
      }

      const trimmedData = filterDataByTime(normalizedData, chartConfig.period);
      setAssetHistory(
        trimmedData.length > 1
          ? trimmedData
          : normalizedData.slice(-Math.min(200, normalizedData.length)),
      );

      setIsChartLoading(false);
    };

    fetchDetails();
    return () => controller.abort();
  }, [selectedAsset, chartConfig, prices]);

  const handleConfigChange = (key, value) => {
    if (key === "period") {
      setChartConfig({
        period: value,
        interval: periodToInterval(value),
      });
    } else {
      setChartConfig((prev) => ({ ...prev, [key]: value }));
    }
  };

  // -- SUB-COMPONENTS --
  const TickerItem = ({ asset }) => {
    const priceData = prices[asset] || prices[`C:${asset}`] || {};
    const isUp = priceData.changePercent >= 0;
    const isSelected = selectedAsset === asset;

    return (
      <button
        type="button"
        onClick={() => setSelectedAsset(asset)}
        className={`dash-asset-chip ${isSelected ? "dash-asset-chip--active" : ""}`}
      >
        <span
          className={`font-bold text-xs ${isSelected ? "text-primary" : "text-text-main"}`}
        >
          {asset}
        </span>
        <span
          className={`text-[10px] ${isUp ? "text-emerald-500" : "text-red-500"}`}
        >
          {priceData.price?.toFixed(4)} ({isUp ? "+" : ""}
          {Number(priceData.changePercent || 0).toFixed(2)}%)
        </span>
      </button>
    );
  };

  const selectedPrice =
    prices[selectedAsset] ||
    prices[`C:${selectedAsset}`] ||
    prices[selectedAsset?.replace("/", "")];

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
    historyBars: assetHistory,
  });

  const tickerAssets =
    assetsList.length > 0
      ? assetsList
      : ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSD"].map((asset) => ({
          asset,
        }));

  const formatPrice = (symbol, value) => {
    if (value == null) return "—";
    const d = symbol?.includes("JPY") ? 2 : symbol?.includes("BTC") ? 0 : 4;
    return Number(value).toFixed(d);
  };

  const riskLabel = risk?.environment?.replace(/_/g, " ") || "Analyzing…";
  const riskUp = risk?.environment?.includes("RISK_ON");

  return (
    <div className="dash-page dash-overview-grid">
      {fetchError && (
        <div className="dash-empty-banner" role="alert">
          <span className="flex items-center gap-2">
            <AlertTriangle size={16} />
            {fetchError}
          </span>
          <button
            type="button"
            onClick={() => {
              setIsGlobalLoading(true);
              loadMarketData();
            }}
            className="btn-primary text-xs py-1.5 px-3"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      <PageHeader
        icon={BarChart2}
        title="Market Overview"
        description={
          risk?.interpretation ||
          "Live regime, tickers, and risk sentiment across global markets."
        }
        badge={
          <span className="badge-glow text-[10px]">
            {user?.name || "Trader"}
          </span>
        }
        action={
          <button
            type="button"
            onClick={() => navigate("/dashboard/ideas")}
            className="btn-primary text-sm px-5 py-2.5"
          >
            View ideas <ArrowRight size={16} />
          </button>
        }
      />

      <DailyBriefPanel
        brief={brief}
        loading={briefLoading}
        onFocusClick={() => navigate("/dashboard/ideas")}
      />

      <div className="dash-stat-grid">
        <DashStat
          label="System"
          value={systemStatus.online ? "Online" : "Offline"}
          icon={systemStatus.online ? Server : WifiIcon}
          tone={systemStatus.online ? "success" : "danger"}
          sub={isGlobalLoading ? "Syncing feeds…" : "API & data pipeline"}
        />
        <DashStat
          label="Risk regime"
          value={riskLabel}
          icon={Activity}
          tone={riskUp ? "success" : "danger"}
          sub="Macro environment gauge"
        />
        {risk?.details?.vix ? (
          <DashStat
            label="VIX"
            value={risk.details.vix.level}
            icon={Info}
            sub="Volatility index"
          />
        ) : portfolio ? (
          <DashStat
            label="Journal P&L"
            value={`${portfolio.totalPnl >= 0 ? '+' : ''}$${Math.abs(portfolio.totalPnl || 0).toFixed(0)}`}
            icon={Globe}
            tone={portfolio.totalPnl >= 0 ? 'success' : 'danger'}
            sub={`${portfolio.totalTrades || 0} trades · ${(portfolio.winRate || 0).toFixed(0)}% win`}
          />
        ) : (
          <DashStat label="Watchlist" value={assetsList.length || "—"} icon={Globe} sub="Tracked instruments" />
        )}
        <DashStat
          label="Open / Symbol"
          value={portfolio?.openPositions != null ? `${portfolio.openPositions} open` : selectedAsset || "—"}
          icon={Zap}
          tone="primary"
          sub={`${selectedAsset} · ${chartConfig.period}`}
        />
      </div>

      <div className="dash-ticker-rail">
        <div className="flex animate-marquee hover:pause whitespace-nowrap h-full items-center">
          {[...tickerAssets, ...tickerAssets].map((item, idx) => (
            <TickerItem key={`${item.asset}-${idx}`} asset={item.asset} />
          ))}
        </div>
        <div className="dash-ticker-rail__fade-l" />
        <div className="dash-ticker-rail__fade-r" />
        <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } } .animate-marquee { animation: marquee 60s linear infinite; }`}</style>
      </div>

      <AssetGrid
        assetsList={assetsList}
        prices={prices}
        selectedAsset={selectedAsset}
        onSelectAsset={setSelectedAsset}
        viewAll={viewAllAssets}
        onToggleViewAll={() => setViewAllAssets((v) => !v)}
      />

      <DashPanel className="w-full" bodyClassName="p-0 !overflow-visible">
        <div className="dash-market-layout">
        <AssetAnalysisPanel
          symbol={selectedAsset}
          interval={chartConfig.interval}
          period={chartConfig.period}
          risk={risk}
          analysisState={analysisState}
        />

        <div className="dash-market-chart p-5 lg:p-6">
          <div className="dash-live-quote">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-bold mb-1 flex items-center gap-2">
                <span>{selectedAsset}</span>
                <span
                  className={`dash-live-quote__badge ${
                    displayQuote.isModel
                      ? "dash-live-quote__badge--model"
                      : "dash-live-quote__badge--live"
                  }`}
                >
                  {displayQuote.label}
                </span>
              </p>
              <p className="dash-live-quote__price">
                {formatPrice(selectedAsset, displayQuote.price)}
              </p>
            </div>
            {displayQuote.price != null && (
              <span
                className={`dash-live-quote__change ${
                  displayQuote.changePercent >= 0
                    ? "dash-live-quote__change--up"
                    : "dash-live-quote__change--down"
                }`}
              >
                {displayQuote.changePercent >= 0 ? "+" : ""}
                {Number(displayQuote.changePercent || 0).toFixed(2)}%
              </span>
            )}
          </div>

          {displayQuote.showTvDisclaimer && (
            <p className="dash-tv-disclaimer">
              TradingView shows live broker quotes. Analysis and price above use model OHLC while
              the API feed is rate-limited.
            </p>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-3">
            <div className="flex flex-col">
              <h4 className="text-xs text-text-muted uppercase tracking-wider flex items-center gap-2">
                <Clock size={12} /> {chartConfig.period} · TradingView
              </h4>
              {assetHistory.length > 0 && (
                <span className="text-[10px] text-text-muted font-mono mt-1">
                  Updated{" "}
                  {new Date(
                    Math.max(...assetHistory.map((d) => d.time * 1000)),
                  ).toLocaleString()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <DashSelect
                label="Interval"
                value={chartConfig.interval}
                onChange={(e) => handleConfigChange("interval", e.target.value)}
                wrapperClassName="w-[100px]"
                className="!py-1.5 !text-xs"
                options={CHART_INTERVALS.map((opt) => ({ value: opt, label: opt }))}
              />
              <DashSelect
                label="Period"
                value={chartConfig.period}
                onChange={(e) => handleConfigChange("period", e.target.value)}
                wrapperClassName="w-[90px]"
                className="!py-1.5 !text-xs"
                options={CHART_PERIODS.map((opt) => ({ value: opt, label: opt }))}
              />
            </div>
          </div>

          <div className="dash-chart-zone">
            {selectedAsset ? (
              <TradeChart
                key={`${selectedAsset}-${chartConfig.interval}`}
                symbol={selectedAsset}
                interval={chartConfig.interval}
                fill
                interactive
                modelMode={displayQuote.isModel}
                quotePrice={displayQuote.price}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-text-muted text-sm gap-3 p-6 text-center min-h-[440px]">
                <p>Select an asset from Major Assets above.</p>
              </div>
            )}
          </div>
        </div>
        </div>
      </DashPanel>
    </div>
  );
};

export default Dashboard;
