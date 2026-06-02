import React from 'react';
import { Brain } from 'lucide-react';

/** Floating candle hover — factual read, opens full drawer on click */
const MrktChartCandleHover = ({ read, style, onOpenAnalysis, onKeepOpen, onClose }) => {
  if (!read) return null;

  return (
    <div
      className="mrkt-candle-hover"
      style={style}
      onMouseEnter={onKeepOpen}
      onMouseLeave={onClose}
      role="tooltip"
    >
      <span className="mrkt-candle-hover__connector" aria-hidden />
      <div className="mrkt-candle-hover__panel">
        <p className="mrkt-candle-hover__time">{read.barTime}</p>
        <p className="mrkt-candle-hover__move">{read.moveLine}</p>

        <section className="mrkt-candle-hover__block">
          <h4>What happened</h4>
          <p>{read.whatHappened}</p>
        </section>

        {read.whatLed.length > 0 && (
          <section className="mrkt-candle-hover__block">
            <h4>What may have led to this</h4>
            <ul>
              {read.whatLed.map((n) => (
                <li key={n.title}>
                  <span className="mrkt-candle-hover__headline">{n.title}</span>
                  {n.ago && <span className="mrkt-candle-hover__ago">{n.ago}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {read.headlines.length > 0 && (
          <section className="mrkt-candle-hover__block mrkt-candle-hover__block--wire">
            {read.headlines.map((n) => (
              <div key={n.title} className="mrkt-candle-hover__wire">
                <p>{n.title}</p>
                <span>{n.ago}</span>
              </div>
            ))}
          </section>
        )}

        {!read.isLiveTape && (
          <p className="mrkt-candle-hover__disclaimer">Model candles — sync live history for exact bar match.</p>
        )}

        <button type="button" className="mrkt-candle-hover__cta" onClick={onOpenAnalysis}>
          <Brain size={14} aria-hidden />
          Open full candle analysis
        </button>
      </div>
    </div>
  );
};

export default MrktChartCandleHover;
