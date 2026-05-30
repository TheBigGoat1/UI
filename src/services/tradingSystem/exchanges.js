export const SUPPORTED_EXCHANGES = [
  {
    id: "binance",
    label: "Binance",
    requiresPassphrase: false,
    keyHelpUrl: "https://www.binance.com/en/my/settings/api-management",
  },
  {
    id: "bybit",
    label: "Bybit",
    requiresPassphrase: false,
    keyHelpUrl: "https://www.bybit.com/app/user/api-management",
  },
  {
    id: "okx",
    label: "OKX",
    requiresPassphrase: true,
    keyHelpUrl: "https://www.okx.com/account/my-api",
  },
];

export const getExchangeMeta = (exchangeId) =>
  SUPPORTED_EXCHANGES.find((exchange) => exchange.id === exchangeId);
