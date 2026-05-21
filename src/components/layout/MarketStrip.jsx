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

const PARTNERS = ['Reuters', 'Bloomberg', 'LSEG', 'TradingView', 'Forex Factory', 'Investing.com'];

const TickerItem = ({ pair, price, change, up }) => (
  <div className="market-ticker__item">
    <span className="market-ticker__pair">{pair}</span>
    <span className="market-ticker__price">{price}</span>
    <span className={`market-ticker__change ${up ? 'market-ticker__change--up' : 'market-ticker__change--down'}`}>
      {change}
    </span>
  </div>
);

/** One duplicated strip — animation moves exactly -50% for seamless loop */
const TickerTrack = () => (
  <div className="market-ticker__track" role="marquee" aria-label="Live market prices">
    <div className="market-ticker__strip">
      {TICKERS.map((t) => (
        <TickerItem key={`a-${t.pair}`} {...t} />
      ))}
      {TICKERS.map((t) => (
        <TickerItem key={`b-${t.pair}`} {...t} />
      ))}
    </div>
  </div>
);

const MarketStrip = () => (
  <section className="market-strip" aria-label="Live markets and data partners">
    <div className="market-strip__inner max-w-7xl mx-auto bg-transparent">
      <div className="market-strip__row market-strip__row--ticker">
        <span className="market-strip__label">
          <span className="market-strip__live-dot" aria-hidden="true" />
          Live Markets
        </span>
        <div className="market-ticker">
          <TickerTrack />
        </div>
      </div>

      <div className="market-strip__divider" />

      <div className="market-strip__row market-strip__row--partners">
        <span className="market-strip__label">Research Feeds</span>
        <div className="market-partners">
          {PARTNERS.map((name) => (
            <span key={name} className="market-partners__name">
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default MarketStrip;
