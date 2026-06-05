import React from 'react';
import { formatTfLabel } from '../../utils/timeframeStack.js';
import { formatPrice } from '../../utils/displayFormat.js';

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

function TapeTag({ tapeState, priceSource, isLive }) {
  if (tapeState === 'live' || (isLive && priceSource === 'tradingview')) {
    return (
      <span
        className="mrkt-terminal__live-tag mrkt-terminal__live-tag--on"
        title="TradingView scanner — same ticker as chart"
      >
        LIVE
      </span>
    );
  }
  if (tapeState === 'syncing') {
    return (
      <span className="mrkt-terminal__live-tag mrkt-terminal__live-tag--syncing" title="Syncing desk tape with chart">
        SYNCING
      </span>
    );
  }
  return (
    <span className="mrkt-terminal__live-tag" title={priceSource || 'awaiting tape'}>
      MODEL
    </span>
  );
}

const MrktTerminalHeader = ({
  headline,
  symbol,
  price,
  changeAbs,
  changePercent,
  isLive = false,
  tapeState = 'syncing',
  priceSource,
  swingTrend,
  dayTrend,
  chartInterval = '1h',
  chartPeriod = '1W',
  timeframe,
}) => {
  const htfLabel = timeframe?.htfLabel || `${formatTfLabel(chartInterval === '1h' ? '4h' : chartInterval)} · ${chartPeriod}`;
  const ltfLabel = timeframe?.chartLabel || `${formatTfLabel(chartInterval)} · ${chartPeriod}`;

  const ch = Number(changePercent);
  const abs = Number(changeAbs);
  const up = Number.isFinite(ch) ? ch >= 0 : true;
  const hasPrice = Number.isFinite(Number(price)) && Number(price) > 0;

  return (
    <header className="mrkt-terminal__header">
      <h1 className="mrkt-terminal__headline">{headline}</h1>
      <div className="mrkt-terminal__header-right">
        <div className="mrkt-terminal__price-block">
          {hasPrice ? (
            <>
              <span className={`mrkt-terminal__price ${up ? 'mrkt-terminal__price--up' : 'mrkt-terminal__price--down'}`}>
                {formatPrice(price, symbol)}
              </span>
              {Number.isFinite(abs) && Number.isFinite(ch) && (
                <span className={`mrkt-terminal__change ${up ? 'mrkt-terminal__change--up' : 'mrkt-terminal__change--down'}`}>
                  {abs >= 0 ? '+' : ''}
                  {abs.toFixed(2)} / {ch >= 0 ? '+' : ''}
                  {ch.toFixed(2)}%
                </span>
              )}
            </>
          ) : (
            <span className="mrkt-terminal__price mrkt-terminal__price--syncing" role="status">
              Syncing tape…
            </span>
          )}
          <TapeTag tapeState={tapeState} priceSource={priceSource} isLive={isLive} />
        </div>
        <div className="mrkt-terminal__sentiment-row">
          <SentimentPill mode="SWING TRADING" trend={swingTrend} tfLabel={htfLabel} />
          <SentimentPill mode="DAY TRADING" trend={dayTrend} tfLabel={ltfLabel} />
        </div>
      </div>
    </header>
  );
};

export default MrktTerminalHeader;
