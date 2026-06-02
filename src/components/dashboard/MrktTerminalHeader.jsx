import React from 'react';

function trendToSentiment(trend) {
  if (!trend || trend === '—' || trend === '…') return { label: 'Neutral', tone: 'neutral' };
  const t = String(trend).toUpperCase();
  if (t.includes('STRONG') && t.includes('BULL')) return { label: 'Bullish', tone: 'bull' };
  if (t.includes('BULL')) return { label: 'Slightly Bullish', tone: 'bull' };
  if (t.includes('STRONG') && t.includes('BEAR')) return { label: 'Bearish', tone: 'bear' };
  if (t.includes('BEAR')) return { label: 'Slightly Bearish', tone: 'bear' };
  return { label: 'Neutral', tone: 'neutral' };
}

function WavyBullIcon() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden>
      <path
        d="M1 7.5C2.5 5 4 8.5 5.5 5.5C7 2.5 8.5 6 10 3.5C11.2 1.5 12.2 2.5 13 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SentimentPill({ mode, trend }) {
  const { label, tone } = trendToSentiment(trend);
  return (
    <span
      className={`mrkt-sentiment-pill ${
        tone === 'bear' ? 'mrkt-sentiment-pill--bear' : tone === 'neutral' ? 'mrkt-sentiment-pill--neutral' : ''
      }`}
    >
      <span className="mrkt-sentiment-pill__mode">{mode}</span>
      <WavyBullIcon />
      <span className="mrkt-sentiment-pill__value">{label}</span>
    </span>
  );
}

const MrktTerminalHeader = ({
  headline,
  price,
  changeAbs,
  changePercent,
  swingTrend,
  dayTrend,
}) => {
  const isUp = Number(changePercent) >= 0;
  const isDown = Number(changePercent) < 0;
  const fmtPrice = (val) => {
    if (val == null) return '—';
    const n = Number(val);
    if (n > 500) return n.toFixed(2);
    return n.toFixed(4);
  };

  const absVal = changeAbs != null ? Math.abs(Number(changeAbs)) : null;
  const pctVal = changePercent != null ? Number(changePercent) : null;
  const changeLine =
    absVal != null && pctVal != null
      ? `${isDown ? '▼ ' : isUp ? '▲ ' : ''}${isDown ? '-' : isUp ? '+' : ''}${absVal.toFixed(2)} ${isDown ? '' : isUp ? '+' : ''}${pctVal.toFixed(2)}%`
      : pctVal != null
        ? `${pctVal.toFixed(2)}%`
        : '';

  return (
    <header className="mrkt-terminal__header">
      <h1 className="mrkt-terminal__headline">{headline}</h1>

      <div className="mrkt-terminal__price-block">
        <span className="mrkt-terminal__price">{fmtPrice(price)}</span>
        {changeLine && (
          <span
            className={`mrkt-terminal__change ${
              isUp ? 'mrkt-terminal__change--up' : 'mrkt-terminal__change--down'
            }`}
          >
            {changeLine}
          </span>
        )}
      </div>

      <div className="mrkt-terminal__sentiment-row">
        <SentimentPill mode="SWING TRADING" trend={swingTrend} />
        <SentimentPill mode="DAY TRADING" trend={dayTrend} />
      </div>
    </header>
  );
};

export default MrktTerminalHeader;
