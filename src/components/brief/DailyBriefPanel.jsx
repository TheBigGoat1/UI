import React from 'react';
import { Shield, Target, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import TodaysFocusCard from './TodaysFocusCard';
import SitOutHero from './SitOutHero';

const regimeIcon = (env) => {
  if (env === 'RISK_ON') return TrendingUp;
  if (env === 'RISK_OFF') return TrendingDown;
  return Shield;
};

const DailyBriefPanel = ({ brief, onFocusClick, loading }) => {
  if (loading) {
    return (
      <div className="daily-brief daily-brief--loading">
        <div className="daily-brief__shimmer" />
        <p className="text-xs text-text-muted">Building your session brief…</p>
      </div>
    );
  }
  if (!brief) return null;

  const RegimeIcon = regimeIcon(brief.regime?.environment);
  const heat = brief.bookHeat;

  return (
    <section className="daily-brief" aria-label="Daily trading brief">
      <div className="daily-brief__header">
        <div>
          <p className="daily-brief__eyebrow">Daily brief</p>
          <h2 className="daily-brief__title">
            {brief.session?.label} session · {brief.regime?.environment?.replace(/_/g, ' ')}
          </h2>
          <p className="daily-brief__guidance">{brief.regime?.guidance}</p>
        </div>
        <div className="daily-brief__chips">
          <span className="daily-brief__chip">
            <RegimeIcon size={12} />
            VIX {brief.regime?.vix != null ? brief.regime.vix.toFixed(1) : '—'}
          </span>
          {heat && (
            <span
              className={`daily-brief__chip ${heat.overHeat ? 'daily-brief__chip--warn' : ''}`}
            >
              <Zap size={12} />
              Book heat {heat.heatPercent}% / {heat.maxHeatPercent}%
            </span>
          )}
          {brief.scorecard?.sampleSize > 0 && (
            <span className="daily-brief__chip">
              Track record {brief.scorecard.winRate}% · n={brief.scorecard.sampleSize}
            </span>
          )}
        </div>
      </div>

      <p className="daily-brief__veteran">{brief.veteranLine}</p>

      {brief.sitOut && !brief.todaysFocus ? (
        <SitOutHero message={brief.sitOutMessage} />
      ) : (
        <TodaysFocusCard idea={brief.todaysFocus} onOpen={onFocusClick} />
      )}

      {brief.sitOutMessage && brief.todaysFocus && (
        <p className="daily-brief__sitout-soft">{brief.sitOutMessage}</p>
      )}

      {brief.lastSuppressed?.length > 0 && (
        <details className="daily-brief__suppressed">
          <summary>
            {brief.lastSuppressed.length} setup(s) filtered for diversification
          </summary>
          <ul>
            {brief.lastSuppressed.slice(0, 6).map((s, i) => (
              <li key={`${s.symbol}-${i}`}>
                <strong>{s.symbol}</strong> — {s.label || s.reason}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="daily-brief__footer">
        <Link to="/dashboard/ideas" className="text-xs text-primary font-bold hover:underline">
          All ideas →
        </Link>
        <Link to="/dashboard/journal" className="text-xs text-text-muted hover:text-text-main">
          Weekly debrief →
        </Link>
      </div>
    </section>
  );
};

export default DailyBriefPanel;
