import React, { useEffect, useState } from "react";
import { api } from "../services/api/api.js";

import {
  Activity,
  DollarSign,
  ArrowRight,
  Server,
  WifiIcon,
  Info,
  Globe,
  Zap,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Maximize2,
  X,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader";
import DashStat from "../components/dashboard/DashStat";
import DashPanel from "../components/dashboard/DashPanel";
import { useAuth } from "../context/AuthContext";

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
  const [assetProfile, setAssetProfile] = useState(null);
  const [technicals, setTechnicals] = useState(null);
  const [isChartLoading, setIsChartLoading] = useState(false);

  // Chart & Global State
  const [chartConfig, setChartConfig] = useState({
    interval: "1day",
    period: "1W",
  });
  const [risk, setRisk] = useState(null);
  const [systemStatus, setSystemStatus] = useState({ online: false });
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const INTERVAL_OPTIONS = ["1m", "5m", "15m", "1h", "4h", "1day", "1week"];
  const PERIOD_OPTIONS = ["1D", "1W", "1M", "3M", "1Y"];

  // --- TIME FILTER ---
  const filterDataByTime = (data, period) => {
    if (!data || data.length === 0) return [];
    const timestamps = data.map((d) => d.time);
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
    return data.filter((d) => d.time >= cutoffTime);
  };

  // -- DATA FETCHING --
  useEffect(() => {
    const initData = async () => {
      try {
        const [healthRes, riskRes, listRes, pricesRes] = await Promise.all([
          api.system.getHealth(),
          api.analysis.getRiskEnvironment(),
          api.market.getAssetsList(),
          api.market.getAllPrices(),
        ]);

        setSystemStatus({ online: healthRes.success });
        if (riskRes.success) setRisk(riskRes.data);
        if (pricesRes.success) setPrices(pricesRes.data);

        if (listRes.success && Array.isArray(listRes.data)) {
          setAssetsList(listRes.data);
          if (!selectedAsset && listRes.data.length > 0)
            setSelectedAsset(listRes.data[0].asset);
        }
      } catch (error) {
        setSystemStatus({ online: false });
      } finally {
        setIsGlobalLoading(false);
      }
    };
    initData();
    const interval = setInterval(async () => {
      const res = await api.market.getAllPrices();
      if (res.success) setPrices(res.data);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // -- DETAILED ASSET FETCH --
  useEffect(() => {
    if (!selectedAsset) return;

    const controller = new AbortController();
    setIsChartLoading(true);
    setAssetHistory([]);
    setTechnicals(null);

    const fetchDetails = async () => {
      try {
        const techCall = api.technical?.getAnalysis
          ? api.technical.getAnalysis(selectedAsset)
          : api.ideas.getTechnicalAnalysis(selectedAsset);

        const [historyRes, profileRes, techRes] = await Promise.all([
          api.market.getHistory(
            selectedAsset,
            chartConfig.interval,
            chartConfig.period,
          ),
          api.market.getAssetProfile(selectedAsset),
          techCall,
        ]);

        if (!controller.signal.aborted) {
          if (historyRes.success && Array.isArray(historyRes.data)) {
            const normalizedData = historyRes.data.map((d) => ({
              ...d,
              time: d.time > 10000000000 ? d.time / 1000 : d.time,
              close: Number(d.close),
            }));
            const trimmedData = filterDataByTime(
              normalizedData,
              chartConfig.period,
            );
            setAssetHistory(trimmedData);
          }
          if (profileRes.success) setAssetProfile(profileRes.data);
          if (techRes.success) setTechnicals(techRes.data);

          setIsChartLoading(false);
        }
      } catch (e) {
        if (!controller.signal.aborted) setIsChartLoading(false);
      }
    };

    fetchDetails();
    return () => controller.abort();
  }, [selectedAsset, chartConfig]);

  // -- HELPERS --
  const TOP_ASSETS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSD"];
  const totalPages = Math.ceil(assetsList.length / ITEMS_PER_PAGE);

  const displayedAssets = viewAllAssets
    ? assetsList
        .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
        .map((a) => a.asset)
    : TOP_ASSETS;

  const handlePageChange = (direction) => {
    if (direction === "next" && currentPage < totalPages)
      setCurrentPage((p) => p + 1);
    if (direction === "prev" && currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const handleConfigChange = (key, value) => {
    if (key === "period") {
      const smartIntervals = {
        "1D": "5m",
        "1W": "1h",
        "1M": "4h",
        "3M": "1day",
        "1Y": "1day",
      };
      setChartConfig({
        period: value,
        interval: smartIntervals[value] || "1day",
      });
    } else {
      setChartConfig((prev) => ({ ...prev, [key]: value }));
    }
  };

  const getBiasColor = (bias) => {
    if (!bias || typeof bias !== "string") return "text-text-muted";
    if (bias.includes("BULL")) return "text-emerald-500";
    if (bias.includes("BEAR")) return "text-red-500";
    return "text-yellow-500";
  };

  const htfTrend = technicals?.modules?.marketStructure?.htf?.trend;
  const ltfTrend = technicals?.modules?.marketStructure?.ltf?.trend;

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

  const PriceCard = ({ symbol }) => {
    const data =
      prices[symbol] ||
      prices[`C:${symbol}`] ||
      prices[symbol.replace("/", "")];
    if (!data) return null;
    const isUp = data.changePercent >= 0;
    const isSelected = selectedAsset === symbol;
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => setSelectedAsset(symbol)}
        onKeyDown={(e) => e.key === "Enter" && setSelectedAsset(symbol)}
        className={`dash-price-card relative flex flex-col justify-between ${isSelected ? "dash-price-card--active" : ""}`}
      >
        <div className="flex justify-between items-start mb-2">
          <span
            className={`font-bold transition-colors ${isSelected ? "text-primary" : "text-text-main"}`}
          >
            {symbol}
          </span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${isUp ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}
          >
            {isUp ? "+" : ""}
            {Number(data.changePercent).toFixed(2)}%
          </span>
        </div>
        <div className="text-xl font-mono text-text-main">
          {data.price?.toFixed(symbol.includes("JPY") ? 2 : 4)}
        </div>
      </div>
    );
  };

  const riskLabel = risk?.environment?.replace(/_/g, " ") || "Analyzing…";
  const riskUp = risk?.environment?.includes("RISK_ON");

  return (
    <div className="dash-page">
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
        ) : (
          <DashStat label="Watchlist" value={assetsList.length || "—"} icon={Globe} sub="Tracked instruments" />
        )}
        <DashStat
          label="Active symbol"
          value={selectedAsset || "—"}
          icon={Zap}
          tone="primary"
          sub={`${chartConfig.period} · ${chartConfig.interval}`}
        />
      </div>

      <div className="dash-ticker-rail">
        <div className="flex animate-marquee hover:pause whitespace-nowrap h-full items-center">
          {[...assetsList, ...assetsList].map((item, idx) => (
            <TickerItem key={`${item.asset}-${idx}`} asset={item.asset} />
          ))}
        </div>
        <div className="dash-ticker-rail__fade-l" />
        <div className="dash-ticker-rail__fade-r" />
        <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } } .animate-marquee { animation: marquee 60s linear infinite; }`}</style>
      </div>

      {/* ASSETS LIST */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-500" /> Major Assets
          </h3>
          <div className="flex items-center gap-3">
            {!viewAllAssets ? (
              <button
                onClick={() => setViewAllAssets(true)}
                className="text-xs text-primary hover:text-blue-400 flex items-center gap-1 transition-colors"
              >
                View All Assets <ArrowRight size={12} />
              </button>
            ) : (
              <button
                onClick={() => {
                  setViewAllAssets(false);
                  setCurrentPage(1);
                }}
                className="text-xs text-text-muted hover:text-text-main flex items-center gap-1 transition-colors"
              >
                <X size={12} /> Close List
              </button>
            )}
            {viewAllAssets && (
              <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-2 py-1 ml-2">
                <button
                  onClick={() => handlePageChange("prev")}
                  disabled={currentPage === 1}
                  className="p-1 hover:bg-background rounded disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-mono text-text-muted w-8 text-center">
                  {currentPage}/{totalPages}
                </span>
                <button
                  onClick={() => handlePageChange("next")}
                  disabled={currentPage === totalPages}
                  className="p-1 hover:bg-background rounded disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {displayedAssets.map((symbol) => (
            <PriceCard key={symbol} symbol={symbol} />
          ))}
        </div>
      </div>

      <DashPanel
        className="flex flex-col md:flex-row min-h-[480px]"
        bodyClassName="p-0 flex flex-col md:flex-row min-h-[480px]"
      >
        <div className="w-full md:w-[34%] p-6 border-b md:border-b-0 md:border-r border-border/50 flex flex-col bg-background/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-lg text-text-main flex items-center gap-2">
              <BarChart2 size={20} className="text-primary" /> Analysis
            </h3>
            {selectedAsset && (
              <span className="badge-glow text-[10px]">{selectedAsset}</span>
            )}
          </div>
          {selectedAsset ? (
            <div className="space-y-6 flex-1">
              {/* 1. Technical Structure */}
              {technicals && (
                <div className="bg-background border border-border rounded p-3">
                  <div className="flex items-center gap-2 text-xs text-text-muted mb-2 font-bold uppercase tracking-wider">
                    <TrendingUp size={12} /> Technical Structure
                  </div>
                  <div className="flex justify-between items-center bg-surface rounded p-2">
                    <div className="text-center flex-1">
                      <span className="text-[10px] text-text-muted block mb-1">
                        HTF TREND
                      </span>
                      <div
                        className={`font-mono font-bold text-xs ${getBiasColor(htfTrend)}`}
                      >
                        {htfTrend || "--"}
                      </div>
                    </div>
                    <div className="w-px h-8 bg-border"></div>
                    <div className="text-center flex-1">
                      <span className="text-[10px] text-text-muted block mb-1">
                        LTF TREND
                      </span>
                      <div
                        className={`font-mono font-bold text-xs ${getBiasColor(ltfTrend)}`}
                      >
                        {ltfTrend || "--"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Behavior Profile */}
              <div>
                <h4 className="text-xs text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Info size={12} /> Behavior Profile
                </h4>
                <p className="text-sm text-text-muted leading-relaxed">
                  {isChartLoading && !assetProfile
                    ? "Loading profile..."
                    : assetProfile?.typical_behaviour ||
                      "Profile unavailable for this asset."}
                </p>
              </div>

              {/* 3. Key Regions & Correlations */}
              <div className="space-y-3">
                <div className="bg-background border border-border rounded p-3">
                  <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
                    <Globe size={12} /> Key Regions
                  </div>
                  <div className="font-mono text-sm font-bold">
                    {assetProfile?.key_drivers?.countries?.join(" • ") || "--"}
                  </div>
                </div>
                <div className="bg-background border border-border rounded p-3">
                  <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
                    <Zap size={12} /> Market Correlation
                  </div>
                  <div className="font-mono text-sm font-bold text-text-main">
                    {assetProfile?.correlations?.positive
                      ?.slice(0, 2)
                      .join(", ") || "--"}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-muted text-sm italic">
              Select an asset to view details.
            </div>
          )}
        </div>

        <div className="w-full md:w-[66%] p-6 flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <div className="flex flex-col">
              <h4 className="text-xs text-text-muted uppercase tracking-wider flex items-center gap-2">
                <Clock size={12} /> {chartConfig.period} Performance
              </h4>
              {assetHistory.length > 0 && (
                <span className="text-[10px] text-text-muted font-mono mt-1 ml-5">
                  Last Update:{" "}
                  {new Date(
                    Math.max(...assetHistory.map((d) => d.time * 1000)),
                  ).toLocaleString()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-background border border-border rounded-md px-2 py-1">
                <span className="text-[10px] text-text-muted mr-2 uppercase">
                  Interval
                </span>
                <select
                  value={chartConfig.interval}
                  onChange={(e) =>
                    handleConfigChange("interval", e.target.value)
                  }
                  className="bg-transparent text-xs font-bold text-text-main outline-none cursor-pointer"
                >
                  {INTERVAL_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="bg-surface">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center bg-background border border-border rounded-md px-2 py-1">
                <span className="text-[10px] text-text-muted mr-2 uppercase">
                  Period
                </span>
                <select
                  value={chartConfig.period}
                  onChange={(e) => handleConfigChange("period", e.target.value)}
                  className="bg-transparent text-xs font-bold text-text-main outline-none cursor-pointer"
                >
                  {PERIOD_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="bg-surface">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <button className="p-1 hover:bg-background rounded text-text-muted hover:text-text-main transition-colors ml-2">
                <Maximize2 size={16} />
              </button>
            </div>
          </div>

          <div className="dash-chart-zone flex-1">
            {isChartLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-text-muted gap-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs">Fetching Historical Data...</span>
              </div>
            ) : assetHistory.length > 0 ? (
              <Sparkline
                key={selectedAsset + chartConfig.period + chartConfig.interval}
                data={assetHistory}
                height={300}
                color={
                  prices[selectedAsset]?.changePercent >= 0
                    ? "#10b981"
                    : "#ef4444"
                }
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">
                {selectedAsset
                  ? "No historical data available for this range"
                  : "Select an asset from the list"}
              </div>
            )}
          </div>
        </div>
      </DashPanel>
    </div>
  );
};

// --- CHART COMPONENT ---
const Sparkline = ({ data, color = "#10b981", height = 300 }) => {
  const [hoverData, setHoverData] = useState(null);
  if (!data || data.length < 2)
    return (
      <div className="h-full w-full flex items-center justify-center text-xs text-text-muted">
        Insufficient Data
      </div>
    );
  const width = 1000;
  const margin = { top: 40, bottom: 40, left: 0, right: 0 };
  const chartHeight = height - margin.top - margin.bottom;
  const values = data.map((d) => Number(d.close));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 0.0001;
  const formatPrice = (p) => Number(p).toFixed(4);
  const formatDate = (ts) =>
    new Date(ts * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const normalizedVal = (Number(d.close) - min) / range;
    const y = margin.top + (chartHeight - normalizedVal * chartHeight);
    return { x, y, price: d.close, time: d.time };
  });
  const pathD = `M0,${height} ${points.map((p) => `${p.x},${p.y}`).join(" ")} L${width},${height} Z`;
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  return (
    <div
      className="relative w-full h-full"
      onMouseLeave={() => setHoverData(null)}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible preserve-3d"
      >
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line
          x1="0"
          y1={margin.top}
          x2={width}
          y2={margin.top}
          stroke={color}
          strokeWidth="1"
          strokeDasharray="4,4"
          opacity="0.2"
        />
        <line
          x1="0"
          y1={height - margin.bottom}
          x2={width}
          y2={height - margin.bottom}
          stroke={color}
          strokeWidth="1"
          strokeDasharray="4,4"
          opacity="0.2"
        />
        <path d={pathD} fill={`url(#grad-${color})`} />
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {hoverData && (
          <g>
            <line
              x1={hoverData.x}
              y1={margin.top}
              x2={hoverData.x}
              y2={height - margin.bottom}
              stroke="white"
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity="0.5"
            />
            <circle
              cx={hoverData.x}
              cy={hoverData.y}
              r="6"
              fill={color}
              stroke="white"
              strokeWidth="2"
            />
            <rect
              x={
                hoverData.x - 60 < 0
                  ? 0
                  : hoverData.x + 60 > width
                    ? width - 120
                    : hoverData.x - 60
              }
              y={0}
              width="120"
              height="35"
              rx="4"
              fill="#1e293b"
              stroke={color}
              strokeWidth="1"
            />
            <text
              x={
                hoverData.x < 60
                  ? 60
                  : hoverData.x > width - 60
                    ? width - 60
                    : hoverData.x
              }
              y={22}
              fill="white"
              fontSize="14"
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
            >
              {formatPrice(hoverData.price)}
            </text>
          </g>
        )}
        {!hoverData && (
          <>
            <text
              x="0"
              y={25}
              fill={color}
              fontSize="24"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {formatPrice(max)}
            </text>
            <text
              x="0"
              y={height - 5}
              fill={color}
              fontSize="24"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {formatPrice(min)}
            </text>
            <text
              x="0"
              y={height + 25}
              fill="#64748b"
              fontSize="20"
              fontFamily="sans-serif"
            >
              {formatDate(data[0].time)}
            </text>
            <text
              x={width}
              y={height + 25}
              fill="#64748b"
              fontSize="20"
              fontFamily="sans-serif"
              textAnchor="end"
            >
              {formatDate(data[data.length - 1].time)}
            </text>
          </>
        )}
        {hoverData && (
          <text
            x={width / 2}
            y={height + 25}
            fill="white"
            fontSize="20"
            fontFamily="sans-serif"
            textAnchor="middle"
            fontWeight="bold"
          >
            {formatDate(hoverData.time)}
          </text>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-row">
        {points.map((p, i) => (
          <div
            key={i}
            className="flex-1 hover:bg-white/5 transition-colors cursor-crosshair"
            onMouseEnter={() => setHoverData(p)}
          />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
