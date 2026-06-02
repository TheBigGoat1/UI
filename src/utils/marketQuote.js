/** Whether analysis/meta indicates model (non-live) OHLC. */
export function isModelDataQuality(dataQuality) {
  return dataQuality === 'synthetic' || dataQuality === 'model' || dataQuality === 'fallback';
}

/**
 * Resolve header quote: live API price when available, otherwise align with analysis/chart bars.
 */
export function resolveMarketQuote({
  priceData,
  dataQuality,
  levelsLast,
  historyBars = [],
}) {
  const modelFromAnalysis = isModelDataQuality(dataQuality);
  const modelFromPrice = Boolean(priceData?.synthetic);
  const hasLivePrice = Number.isFinite(Number(priceData?.price)) && !modelFromPrice;
  const isModel = !hasLivePrice && (modelFromAnalysis || modelFromPrice);

  const lastBar =
    historyBars.length > 0 ? Number(historyBars[historyBars.length - 1]?.close) : null;
  const prevBar =
    historyBars.length > 1 ? Number(historyBars[historyBars.length - 2]?.close) : null;

  let price = Number(priceData?.price);
  let changePercent = Number(priceData?.changePercent ?? 0);

  if (hasLivePrice) {
    price = Number(priceData.price);
    changePercent = Number(priceData.changePercent ?? changePercent);
  } else if (isModel) {
    const modelPrice = Number(levelsLast) || lastBar || price;
    if (Number.isFinite(modelPrice)) price = modelPrice;

    if (Number.isFinite(lastBar) && Number.isFinite(prevBar) && prevBar !== 0) {
      changePercent = ((lastBar - prevBar) / prevBar) * 100;
    }
  }

  return {
    price: Number.isFinite(price) ? price : null,
    changePercent: Number.isFinite(changePercent) ? changePercent : 0,
    label: isModel ? 'Model' : 'Live',
    isModel,
    showTvDisclaimer: isModel,
  };
}
