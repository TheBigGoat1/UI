import React from 'react';
import {
  formatPrice,
  formatChangeAbs,
  formatChangePercent,
} from '../../utils/displayFormat.js';
import { formatTfLabel } from '../../utils/timeframeStack.js';

function trendToSentiment(trend) {
  if (!trend) return { label: 'Neutral', tone: 'neutral' };
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

function SentimentPill({ mode, trend, tfLabel }) {
  const { label, tone } = trendToSentiment(trend);
  return (
    <span
      className={`mrkt-sentiment-pill ${
        tone === 'bear' ? 'mrkt-sentiment-pill--bear' : tone === 'neutral' ? 'mrkt-sentiment-pill--neutral' : ''
      }`}
    >
      <span className="mrkt-sentiment-pill__mode">{mode}</span>
      {tfLabel && <span className="mrkt-sentiment-pill__tf">{tfLabel}</span>}
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
  symbol = '',
  chartInterval = '1h',
  chartPeriod = '1W',
  timeframe,
  isLive = true,
  hideTopPrice = false,
  topPriceReason = 'Price displayed on chart axis',
}) => {
  const isUp = Number(changePercent) >= 0;
  const isDown = Number(changePercent) < 0;
  const pctVal = changePercent != null ? Number(changePercent) : null;
  const absVal = changeAbs != null ? Math.abs(Number(changeAbs)) : null;

  const changeLine =
    absVal != null && pctVal != null
      ? `${isDown ? '▼ ' : isUp ? '▲ ' : ''}${isDown ? '-' : isUp ? '+' : ''}${formatChangeAbs(absVal, symbol)} ${formatChangePercent(pctVal)}`
      : pctVal != null
        ? formatChangePercent(pctVal)
        : formatChangePercent(0);

  const htfLabel = timeframe?.htfLabel || `${formatTfLabel(chartInterval === '1h' ? '4h' : chartInterval)} · ${chartPeriod}`;
  const ltfLabel = timeframe?.chartLabel || `${formatTfLabel(chartInterval)} · ${chartPeriod}`;

  return (
    <header className="mrkt-terminal__header">
      <h1 className="mrkt-terminal__headline">{headline}</h1>

      <div className="mrkt-terminal__price-block">
        {hideTopPrice ? (
          <span className="mrkt-terminal__change">{topPriceReason}</span>
        ) : (
          <>
            <span className="mrkt-terminal__price">{formatPrice(price, symbol)}</span>
            <span
              className={`mrkt-terminal__change ${
                isUp ? 'mrkt-terminal__change--up' : 'mrkt-terminal__change--down'
              }`}
            >
              {changeLine}
            </span>
          </>
        )}
        <span className={`mrkt-terminal__live-tag ${isLive ? 'mrkt-terminal__live-tag--on' : ''}`}>
          {isLive ? 'LIVE' : 'MODEL'}
        </span>
      </div>
      <div className="mrkt-terminal__sentiment-row">
        <SentimentPill mode="SWING TRADING" trend={swingTrend} tfLabel={htfLabel} />
        <SentimentPill mode="DAY TRADING" trend={dayTrend} tfLabel={ltfLabel} />
      </div>
    </header>
  );
};

export default MrktTerminalHeader;
