import { buildClientSyntheticHistoryForRange } from './chartConfig.js';

function horizonBars(interval) {
  const map = { '15m': 8, '5m': 12, '1h': 6, '4h': 6, '1day': 4, '1week': 3 };
  return map[interval] || 6;
}

function warmupBars(interval) {
  const map = { '15m': 40, '5m': 50, '1h': 30, '4h': 26, '1day': 22, '1week': 16 };
  return map[interval] || 26;
}

function analyzeBarsClient(bars) {
  const clean = bars.filter((b) => Number.isFinite(b.close));
  if (clean.length < 10) {
    return { bias: 'neutral', confidence: 50, alignment: 'MIXED' };
  }
  const closes = clean.map((b) => b.close);
  const mid = Math.floor(closes.length / 2);
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const htfAvg = avg(closes.slice(0, mid));
  const ltfAvg = avg(closes.slice(mid));
  const last = closes[closes.length - 1];

  const trendFrom = (early, late) => {
    if (!early) return 'NEUTRAL';
    const delta = (late - early) / early;
    if (delta > 0.0025) return 'BULLISH';
    if (delta < -0.0025) return 'BEARISH';
    return 'NEUTRAL';
  };

  const htfTrend = trendFrom(htfAvg, last);
  const ltfTrend = trendFrom(ltfAvg, last);

  let bias = 'neutral';
  if (htfTrend === 'BULLISH' && ltfTrend !== 'BEARISH') bias = 'bullish';
  if (htfTrend === 'BEARISH' && ltfTrend !== 'BULLISH') bias = 'bearish';

  const slope = Math.abs((last - closes[0]) / closes[0]);
  const confidence = Math.min(92, Math.round(55 + slope * 800));

  let alignment = 'MIXED';
  if (htfTrend === ltfTrend && htfTrend !== 'NEUTRAL') alignment = 'ALIGNED';
  else if (
    (htfTrend === 'BULLISH' && ltfTrend === 'BEARISH') ||
    (htfTrend === 'BEARISH' && ltfTrend === 'BULLISH')
  ) {
    alignment = 'CONFLICTING';
  }

  return { bias, confidence, alignment };
}

function barUnix(bar) {
  const t = bar.time;
  return t > 1e12 ? Math.floor(t / 1000) : t;
}

/** Client-side walk-forward when API is rate-limited or offline. */
export function runClientBacktest({
  asset,
  start_date,
  end_date,
  interval = '4h',
  min_confidence = 40,
  risk_reward = 2,
}) {
  const symbol = String(asset || 'EURUSD').toUpperCase();
  const rr = Math.max(1, Number(risk_reward) || 2);
  const minConf = Number(min_confidence) || 40;
  const bars = buildClientSyntheticHistoryForRange(symbol, interval, start_date, end_date);
  const warmup = warmupBars(interval);
  const horizon = horizonBars(interval);

  let correct = 0;
  let total = 0;
  const trades = [];
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;

  for (let i = warmup; i < bars.length - horizon; i += 1) {
    const tech = analyzeBarsClient(bars.slice(i - warmup, i));
    if (tech.bias === 'neutral' || tech.confidence < minConf) continue;

    const entry = Number(bars[i].close);
    const exit = Number(bars[i + horizon].close);
    const move = exit - entry;
    const win =
      tech.bias === 'bullish' ? move > 0 : tech.bias === 'bearish' ? move < 0 : false;

    total += 1;
    if (win) correct += 1;
    equity += win ? rr : -1;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);

    trades.push({
      date: new Date(barUnix(bars[i + horizon]) * 1000).toISOString().slice(0, 10),
      bias: tech.bias,
      confidence: tech.confidence,
      alignment: tech.alignment,
      entry: Number(entry.toFixed(5)),
      exit: Number(exit.toFixed(5)),
      movePct: entry ? Number(((move / entry) * 100).toFixed(3)) : 0,
      result: win ? 'win' : 'loss',
      rMultiple: win ? rr : -1,
    });
  }

  const winRate = total > 0 ? correct / total : 0;
  const grossWins = correct * rr;
  const grossLosses = total - correct;

  return {
    asset: symbol,
    start_date,
    end_date,
    interval,
    total,
    correct,
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    expectancy: total > 0 ? (winRate * rr - (1 - winRate)).toFixed(2) : '0.00',
    profitFactor:
      grossLosses > 0
        ? Number((grossWins / grossLosses).toFixed(2))
        : grossWins > 0
          ? 99
          : 0,
    maxDrawdownR: Number(maxDrawdown.toFixed(2)),
    riskReward: rr,
    trades: trades.slice(-100),
    message:
      total === 0
        ? 'No signals met your confidence threshold on model OHLC. Try lowering min confidence.'
        : 'Ran on model OHLC (live feed rate-limited). Crypto pairs use Binance for best live history.',
    barsUsed: bars.length,
    signalsEvaluated: Math.max(0, bars.length - warmup - horizon),
    dataSource: 'synthetic',
    assetClass: symbol.includes('BTC') || symbol.includes('ETH') ? 'crypto' : 'forex',
  };
}

export function isRecoverableBacktestError(err) {
  const msg = String(err?.error || err?.message || err || '');
  return /429|rate.?limit|model ohlc|offline|unreachable|HTTP 5|invalid json|empty response|invalid response|temporarily unavailable/i.test(
    msg,
  );
}
