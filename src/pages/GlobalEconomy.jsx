import React, { useCallback, useEffect, useState } from 'react';
import { Globe, RefreshCw, LayoutGrid, List } from 'lucide-react';
import SparklineCard from '../components/macro/SparklineCard.jsx';
import DashSelect from '../components/ui/DashSelect.jsx';
import { api } from '../services/api/api.js';

const GlobalEconomy = () => {
  const [countries, setCountries] = useState([]);
  const [country, setCountry] = useState('US');
  const [data, setData] = useState(null);
  const [view, setView] = useState('grouped');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCountries = useCallback(async () => {
    try {
      const res = await api.economy.getIndicatorCountries();
      if (res?.success && Array.isArray(res.data)) setCountries(res.data);
    } catch {
      setCountries([{ code: 'US', label: 'United States' }]);
    }
  }, []);

  const loadIndicators = useCallback(async (code) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.economy.getIndicators(code);
      if (res?.success) setData(res.data);
      else setError(res?.error || 'Could not load indicators.');
    } catch (e) {
      setError(e?.error || e?.message || 'Indicators API unreachable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCountries();
  }, [loadCountries]);

  useEffect(() => {
    loadIndicators(country);
  }, [country, loadIndicators]);

  const flatItems = data?.groups?.flatMap((g) =>
    g.items.map((item) => ({ ...item, group: g.group })),
  ) || [];

  return (
    <div className="ge-page dash-page">
      <header className="ge-page__head">
        <div className="ge-page__title-row">
          <span className="ge-page__icon" aria-hidden>
            <Globe size={18} />
          </span>
          <div>
            <h1 className="ge-page__title">Economy</h1>
            <p className="ge-page__sub">Global economic indicators by country</p>
          </div>
        </div>
        <div className="ge-page__controls">
          <DashSelect
            label="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            wrapperClassName="ge-page__country"
            options={countries.map((c) => ({ value: c.code, label: c.label }))}
          />
          <div className="ge-page__view-toggle">
            <button
              type="button"
              className={view === 'grouped' ? 'is-active' : ''}
              onClick={() => setView('grouped')}
            >
              <LayoutGrid size={14} /> Grouped
            </button>
            <button
              type="button"
              className={view === 'list' ? 'is-active' : ''}
              onClick={() => setView('list')}
            >
              <List size={14} /> List
            </button>
          </div>
          <button
            type="button"
            className="ge-page__refresh"
            onClick={() => loadIndicators(country)}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {error && <p className="ge-page__error">{error}</p>}

      <p className="ge-page__meta">
        {loading ? 'Loading…' : `${data?.indicatorCount ?? 0} indicators`}
      </p>

      <div className="ge-page__scroll custom-scrollbar">
        {view === 'grouped' ? (
          data?.groups?.map((group) => (
            <section key={group.group} className="ge-section">
              <h2 className="ge-section__title">
                {group.group}
                <span className="ge-section__count">{group.count}</span>
              </h2>
              <div className="ge-section__grid">
                {group.items.map((item) => (
                  <SparklineCard key={item.id} {...item} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="ge-section__grid ge-section__grid--list">
            {flatItems.map((item) => (
              <SparklineCard key={item.id} {...item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalEconomy;
