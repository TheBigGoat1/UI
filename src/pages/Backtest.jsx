import React, { useEffect, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { CandlestickChart, FlaskConical } from 'lucide-react';
import BacktestFundamentals from './BacktestFundamentals.jsx';
import BacktestStrategyLab from './BacktestStrategyLab.jsx';

const TABS = [
  { id: 'fundamentals', label: 'Fundamentals', icon: CandlestickChart },
  { id: 'strategy', label: 'Strategy Lab', icon: FlaskConical },
];

const Backtest = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const preset = location.state?.preset;

  const activeTab = useMemo(() => {
    const fromUrl = searchParams.get('tab');
    if (fromUrl === 'strategy' || fromUrl === 'fundamentals') return fromUrl;
    if (preset) return 'strategy';
    return 'fundamentals';
  }, [searchParams, preset]);

  useEffect(() => {
    if (preset && searchParams.get('tab') !== 'strategy') {
      setSearchParams({ tab: 'strategy' }, { replace: true });
    }
  }, [preset, searchParams, setSearchParams]);

  const setTab = (tab) => {
    setSearchParams({ tab }, { replace: true });
  };

  return (
    <div className={`dash-page bt-page ${activeTab === 'fundamentals' ? 'bt-page--fundamentals' : ''}`}>
      <nav className="bt-page__tabs" aria-label="Backtest modes">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`bt-page__tab ${activeTab === id ? 'is-active' : ''}`}
            onClick={() => setTab(id)}
            aria-current={activeTab === id ? 'page' : undefined}
          >
            <Icon size={16} aria-hidden />
            {label}
          </button>
        ))}
      </nav>

      {activeTab === 'fundamentals' ? <BacktestFundamentals /> : <BacktestStrategyLab />}
    </div>
  );
};

export default Backtest;
