import React, { useCallback, useEffect, useState } from 'react';
import { Globe, RefreshCw, AlertTriangle, Sparkles, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import DashSelect from '../components/ui/DashSelect.jsx';
import RiskRegimeBanner from '../components/macro/RiskRegimeBanner';
import { api } from '../services/api/api';

const directionLabel = (d) => {
  if (d === 'high-volatility') return 'High volatility';
  if (d === 'elevated') return 'Elevated';
  return 'Stable';
};

const directionTone = (d) => {
  if (d === 'high-volatility') return 'text-red-400 border-red-500/30 bg-red-500/10';
  if (d === 'elevated') return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
  return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
};

const Economy = () => {
  const [countries, setCountries] = useState([]);
  const [selected, setSelected] = useState('US');
  const [detail, setDetail] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  const loadCountries = useCallback(async () => {
    setLoadingList(true);
    setError('');
    try {
      const res = await api.economy.getCountries();
      if (res?.success && Array.isArray(res.data)) {
        setCountries(res.data);
        if (res.data.length && !res.data.find((c) => c.country === selected)) {
          setSelected(res.data[0].country);
        }
      } else {
        setError(res?.error || 'Could not load country list.');
      }
    } catch (e) {
      setError(e?.error || 'Economy API unreachable.');
    } finally {
      setLoadingList(false);
    }
  }, [selected]);

  const loadCountry = useCallback(async (code) => {
    if (!code) return;
    setLoadingDetail(true);
    setError('');
    try {
      const res = await api.economy.getCountry(code);
      if (res?.success) setDetail(res.data);
      else setError(res?.error || 'Failed to load country macro data.');
    } catch (e) {
      setError(e?.error || 'Failed to load country macro data.');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setError('');
    try {
      const res = await api.economy.sync();
      if (!res?.success) throw new Error(res?.error || 'Sync failed');
      await loadCountries();
      await loadCountry(selected);
    } catch (e) {
      setError(e?.error || e?.message || 'Calendar sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadCountries();
  }, [loadCountries]);

  useEffect(() => {
    loadCountry(selected);
  }, [selected, loadCountry]);

  return (
    <div className="dash-page max-w-6xl mx-auto space-y-6">
      <PageHeader
        icon={Globe}
        title="Economy Intelligence"
        description="9-country macro pipeline with event depth, risk scoring, and AI interpretation."
        action={
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="btn-primary text-sm py-2 px-4 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Refresh macro data'}
          </button>
        }
      />

      <RiskRegimeBanner compact />

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 px-4 py-3 text-sm flex items-start gap-2">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* 9-country overview grid */}
      <div className="dash-panel">
        <div className="dash-panel__head flex-wrap gap-2">
          <h3 className="dash-panel__title">Macro pulse · 9 countries</h3>
          {loadingList && (
            <span className="text-xs text-text-muted flex items-center gap-1">
              <RefreshCw size={12} className="animate-spin" /> Loading…
            </span>
          )}
        </div>
        <div className="dash-panel__body">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2">
            {countries.map((c) => (
              <button
                key={c.country}
                type="button"
                onClick={() => setSelected(c.country)}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  selected === c.country
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background/40 hover:border-primary/30'
                }`}
              >
                <div className="font-bold text-sm text-text-main">{c.label || c.country}</div>
                <div className="text-[10px] text-text-muted mt-0.5">{c.currency}</div>
                <div
                  className={`text-[10px] font-bold uppercase mt-2 inline-block px-1.5 py-0.5 rounded border ${directionTone(c.direction)}`}
                >
                  {directionLabel(c.direction)}
                </div>
                <div className="text-[10px] text-text-muted mt-1 font-mono">
                  Risk {c.riskScore} · {c.eventCount ?? 0} events
                </div>
              </button>
            ))}
          </div>
          {!loadingList && countries.length === 0 && (
            <p className="text-sm text-text-muted text-center py-6">
              No macro data yet. Click &quot;Refresh macro data&quot; to build the calendar pipeline.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <DashSelect
          label="Country detail"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          options={(countries.length ? countries : [{ country: 'US', label: 'United States' }]).map(
            (c) => ({
              value: c.country,
              label: `${c.label || c.country} (${c.country})`,
            }),
          )}
          wrapperClassName="max-w-[340px]"
        />
        <Link
          to="/dashboard/calendar"
          className="text-xs text-primary font-bold flex items-center gap-1 hover:underline mb-1"
        >
          <Calendar size={14} /> Full economic calendar
        </Link>
      </div>

      {loadingDetail && !detail && (
        <div className="flex items-center justify-center gap-2 py-12 text-text-muted">
          <RefreshCw className="animate-spin" size={20} />
          <span>Loading {selected} intelligence…</span>
        </div>
      )}

      {detail && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="dash-stat p-4">
              <div className="dash-stat__label">Country</div>
              <div className="dash-stat__value text-xl">{detail.label}</div>
            </div>
            <div className="dash-stat p-4">
              <div className="dash-stat__label">Currency</div>
              <div className="dash-stat__value text-xl">{detail.currency || '—'}</div>
            </div>
            <div className="dash-stat p-4">
              <div className="dash-stat__label">Risk score</div>
              <div className="dash-stat__value text-xl">{detail.riskScore}</div>
            </div>
            <div className="dash-stat p-4">
              <div className="dash-stat__label">Macro pulse</div>
              <div className={`dash-stat__value text-lg ${directionTone(detail.direction).split(' ')[0]}`}>
                {directionLabel(detail.direction)}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center">
              <div className="text-[10px] uppercase text-text-muted font-bold">High impact</div>
              <div className="text-2xl font-bold text-red-400">{detail.counts?.HIGH ?? 0}</div>
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-center">
              <div className="text-[10px] uppercase text-text-muted font-bold">Medium</div>
              <div className="text-2xl font-bold text-amber-400">{detail.counts?.MEDIUM ?? 0}</div>
            </div>
            <div className="rounded-lg border border-border bg-background/30 p-3 text-center">
              <div className="text-[10px] uppercase text-text-muted font-bold">Low</div>
              <div className="text-2xl font-bold text-text-muted">{detail.counts?.LOW ?? 0}</div>
            </div>
          </div>

          {detail.nextEvent && (
            <div className="dash-panel">
              <div className="dash-panel__body">
                <h3 className="font-semibold text-sm mb-2">Next release</h3>
                <p className="text-sm text-text-main font-medium">{detail.nextEvent.event}</p>
                <p className="text-xs text-text-muted mt-1">
                  {new Date(detail.nextEvent.event_time).toLocaleString()} ·{' '}
                  <span className="text-amber-400 font-bold">{detail.nextEvent.impact}</span>
                  {detail.nextEvent.forecast && ` · Fcst ${detail.nextEvent.forecast}`}
                </p>
              </div>
            </div>
          )}

          <div className="dash-panel">
            <div className="dash-panel__body">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Sparkles size={16} className="text-primary" />
                AI interpretation
                {detail.meta?.aiPowered && (
                  <span className="text-[9px] uppercase badge-glow">Claude</span>
                )}
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                {detail.interpretation || 'Interpretation loading…'}
              </p>
              {detail.meta?.eventWindow && (
                <p className="text-[10px] text-text-muted mt-2 font-mono">
                  Window: {detail.meta.eventWindow}
                  {detail.meta?.asOf && ` · Updated ${new Date(detail.meta.asOf).toLocaleString()}`}
                </p>
              )}
            </div>
          </div>

          <div className="dash-panel overflow-x-auto">
            <div className="dash-panel__head">
              <h3 className="dash-panel__title">Event pipeline</h3>
              <span className="text-xs text-text-muted">
                {(detail.events || []).length} releases
              </span>
            </div>
            <div className="dash-panel__body p-0">
              {(detail.events || []).length === 0 ? (
                <p className="text-sm text-text-muted text-center py-8 px-4">
                  No events in window. Run &quot;Refresh macro data&quot; to populate the pipeline.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wider text-text-muted border-b border-border/60">
                    <tr>
                      <th className="px-4 py-3 text-left">Time (UTC)</th>
                      <th className="px-4 py-3 text-left">Event</th>
                      <th className="px-4 py-3 text-left">Impact</th>
                      <th className="px-4 py-3 text-left">Forecast</th>
                      <th className="px-4 py-3 text-left">Actual</th>
                      <th className="px-4 py-3 text-left">Previous</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.events.map((e, i) => (
                      <tr key={`${e.event}-${e.event_time}-${i}`} className="border-b border-border/40">
                        <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">
                          {new Date(e.event_time).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 font-medium">{e.event}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              e.impact === 'HIGH'
                                ? 'bg-red-500/20 text-red-400'
                                : e.impact === 'MEDIUM'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-surface text-text-muted'
                            }`}
                          >
                            {e.impact}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs">{e.forecast || '—'}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{e.actual || '—'}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-text-muted">
                          {e.previous || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Economy;
