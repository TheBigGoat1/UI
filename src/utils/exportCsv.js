const escapeCell = (value) => {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

export function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(escapeCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function buildBacktestCsv({ results, config, dates, riskReward, metrics }) {
  const rows = [
    ['Insidr backtest export'],
    ['Asset', config.asset],
    ['Interval', config.interval],
    ['Start', dates.start],
    ['End', dates.end],
    ['Min confidence', config.minConfidence],
    ['Risk reward', riskReward],
    ['Data source', results.dataSource || '—'],
    [],
    ['Summary'],
    ['Total trades', results.total ?? 0],
    ['Win rate %', metrics.winRatePct],
    ['Profit factor', metrics.profitFactor.toFixed(2)],
    ['Expectancy (R)', metrics.expectancy.toFixed(2)],
    ['Max drawdown (R)', results.maxDrawdownR ?? '—'],
    [],
    ['Date', 'Bias', 'Confidence', 'Entry', 'Exit', 'Move %', 'R', 'Result'],
  ];

  if (Array.isArray(results.trades)) {
    for (const trade of results.trades) {
      rows.push([
        trade.date,
        trade.bias,
        trade.confidence,
        trade.entry,
        trade.exit,
        trade.movePct != null ? trade.movePct : '',
        trade.rMultiple,
        trade.result,
      ]);
    }
  }

  return rows;
}

export function buildJournalCsv(trades) {
  const rows = [
    ['symbol', 'side', 'pnl', 'strategy', 'emotion', 'status', 'opened_at'],
  ];

  for (const trade of trades || []) {
    rows.push([
      trade.asset || trade.symbol || '',
      trade.type || trade.side || '',
      trade.pnl ?? '',
      trade.strategy || '',
      trade.emotion || '',
      trade.status || '',
      trade.entryDate ? new Date(trade.entryDate).toISOString().slice(0, 10) : '',
    ]);
  }

  return rows;
}
