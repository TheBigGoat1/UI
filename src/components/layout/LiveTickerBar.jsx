import React from 'react';

const TICKERS = [
  { pair: 'EUR/USD', price: '1.0845', change: '+0.12%', up: true },
  { pair: 'GBP/USD', price: '1.2450', change: '-0.08%', up: false },
  { pair: 'XAU/USD', price: '2345.50', change: '+1.40%', up: true },
  { pair: 'BTC/USD', price: '64200', change: '-2.10%', up: false },
  { pair: 'SPX500', price: '5120', change: '+0.55%', up: true },
  { pair: 'USD/JPY', price: '154.20', change: '+0.30%', up: true },
  { pair: 'NAS100', price: '18240', change: '+0.22%', up: true },
  { pair: 'USOIL', price: '78.40', change: '-0.45%', up: false },
];

const TickerItem = ({ pair, price, change, up }) => (
  <div className="live-ticker__item">
    <span className="live-ticker__pair">{pair}</span>
    <span className="live-ticker__sep" aria-hidden="true" />
    <span className="live-ticker__price">{price}</span>
    <span className={`live-ticker__change ${up ? 'live-ticker__change--up' : 'live-ticker__change--down'}`}>
      {change}
    </span>
  </div>
);

/**
 * Slim full-width ticker — no labels, sits under navbar, scrolls with chrome.
 */
const LiveTickerBar = () => (
  <div className="live-ticker" role="marquee" aria-label="Live market prices">
    <div className="live-ticker__track">
      <div className="live-ticker__strip">
        {TICKERS.map((t) => (
          <TickerItem key={`a-${t.pair}`} {...t} />
        ))}
        {TICKERS.map((t) => (
          <TickerItem key={`b-${t.pair}`} {...t} />
        ))}
      </div>
    </div>
  </div>
);

export default LiveTickerBar;
