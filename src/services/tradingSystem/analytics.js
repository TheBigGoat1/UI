export const calculateAnalytics = (trades = []) => {
  const tradeCount = trades.length;
  if (!tradeCount) {
    return {
      winRate: 0,
      totalPnl: 0,
      tradeCount: 0,
      riskScore: 0,
      consistencyScore: 0,
      drawdown: 0,
    };
  }

  const wins = trades.filter((trade) => Number(trade.pnl) > 0).length;
  const totalPnl = trades.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0);

  let running = 0;
  let peak = 0;
  let maxDrawdown = 0;
  for (const trade of trades) {
    running += Number(trade.pnl || 0);
    if (running > peak) peak = running;
    const drawdown = peak - running;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  const avgRiskPerTrade =
    trades.reduce((sum, trade) => sum + Math.abs(Number(trade.rMultiple || 0)), 0) / tradeCount;
  const riskScore = Math.max(0, Math.min(100, Math.round(100 - avgRiskPerTrade * 20)));
  const consistencyScore = Math.max(
    0,
    Math.min(100, Math.round((wins / tradeCount) * 80 + (totalPnl > 0 ? 20 : 0))),
  );

  return {
    winRate: (wins / tradeCount) * 100,
    totalPnl,
    tradeCount,
    riskScore,
    consistencyScore,
    drawdown: maxDrawdown,
  };
};
