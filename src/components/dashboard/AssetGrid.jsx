import React from "react";
import { ArrowRight, X } from "lucide-react";

const TOP_ASSETS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSD"];

const CLASS_LABELS = {
  forex: "Forex",
  commodity: "Commodities",
  crypto: "Crypto",
  index: "Indices",
};

const formatPrice = (symbol, value) => {
  if (value == null) return "—";
  if (symbol?.includes("JPY")) return Number(value).toFixed(2);
  if (symbol?.includes("BTC") || symbol?.includes("US30") || symbol?.includes("NAS"))
    return Number(value).toFixed(0);
  if (symbol?.includes("US500") || symbol?.includes("XAU"))
    return Number(value).toFixed(2);
  return Number(value).toFixed(4);
};

function PriceCard({ symbol, data, isSelected, onSelect }) {
  if (!data) {
    return (
      <button
        type="button"
        onClick={() => onSelect(symbol)}
        className={`dash-price-card dash-price-card--loading text-left ${isSelected ? "dash-price-card--active" : ""}`}
      >
        <span className="font-bold text-text-muted">{symbol}</span>
        <span className="text-xs text-text-muted animate-pulse mt-2">Loading…</span>
      </button>
    );
  }

  const isUp = data.changePercent >= 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(symbol)}
      className={`dash-price-card text-left w-full ${isSelected ? "dash-price-card--active" : ""}`}
    >
      <div className="flex justify-between items-start gap-2 mb-2">
        <span className={`font-bold text-sm ${isSelected ? "text-primary" : "text-text-main"}`}>
          {symbol}
        </span>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
            isUp ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
          }`}
        >
          {isUp ? "+" : ""}
          {Number(data.changePercent).toFixed(2)}%
        </span>
      </div>
      <p className="text-lg font-mono font-bold text-text-main">
        {formatPrice(symbol, data.price)}
      </p>
      <p className="text-[10px] text-text-muted mt-1 uppercase tracking-wider">
        {data.synthetic ? "Simulated" : "Live"}
      </p>
    </button>
  );
}

export default function AssetGrid({
  assetsList = [],
  prices = {},
  selectedAsset,
  onSelectAsset,
  viewAll,
  onToggleViewAll,
}) {
  const getPrice = (symbol) =>
    prices[symbol] || prices[`C:${symbol}`] || prices[symbol?.replace("/", "")];

  const fullList =
    assetsList.length > 0
      ? assetsList
      : TOP_ASSETS.map((asset) => ({ asset, class: "forex" }));

  const grouped = viewAll
    ? ["forex", "commodity", "crypto", "index"].map((cls) => ({
        class: cls,
        label: CLASS_LABELS[cls] || cls,
        items: fullList.filter((a) => (a.class || "forex") === cls),
      })).filter((g) => g.items.length > 0)
    : null;

  return (
    <section className="dash-assets-section">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
          Major Assets
          {viewAll && (
            <span className="text-xs font-normal text-text-muted">
              ({fullList.length} instruments)
            </span>
          )}
        </h3>
        <button
          type="button"
          onClick={onToggleViewAll}
          className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
        >
          {viewAll ? (
            <>
              <X size={12} /> Show majors only
            </>
          ) : (
            <>
              View all assets <ArrowRight size={12} />
            </>
          )}
        </button>
      </div>

      {!viewAll ? (
        <div className="dash-assets-grid dash-assets-grid--majors">
          {TOP_ASSETS.map((symbol) => (
            <PriceCard
              key={symbol}
              symbol={symbol}
              data={getPrice(symbol)}
              isSelected={selectedAsset === symbol}
              onSelect={onSelectAsset}
            />
          ))}
        </div>
      ) : (
        <div className="dash-assets-all space-y-6">
          {grouped.map((group) => (
            <div key={group.class}>
              <p className="dash-assets-group-label">{group.label}</p>
              <div className="dash-assets-grid">
                {group.items.map((item) => (
                  <PriceCard
                    key={item.asset}
                    symbol={item.asset}
                    data={getPrice(item.asset)}
                    isSelected={selectedAsset === item.asset}
                    onSelect={onSelectAsset}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
