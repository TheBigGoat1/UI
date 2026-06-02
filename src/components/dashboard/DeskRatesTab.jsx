import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, ArrowRight, RefreshCw, Loader2 } from 'lucide-react';
import { api } from '../../services/api/api.js';
import DeskSparkline from './DeskSparkline.jsx';
import DeskPanelSkeleton from './DeskPanelSkeleton.jsx';
import DeskEventAnalysisPanel from './DeskEventAnalysisPanel.jsx';
import { CENTRAL_BANKS } from '../../utils/deskBiasContent.js';
import {
  filterCbEvents,
  formatRateSource,
  impactBadgeClass,
  mapCalendarToRateRows,
  resolveRateSeries,
  stanceFromEconomy,
} from '../../utils/deskRates.js';

function RatePathChart({ series, latestRate, label, source, loading }) {
  if (loading) {
    return (
      <div className="desk-rates__chart-loading">
        <Loader2 size={18} className="animate-spin" aria-hidden />
        <span>Loading yield series…</span>
      </div>
    );
  }

  if (!series?.length) {
    return (
      <div className="desk-rates__chart-empty">
        <p className="desk-panel-muted">Policy rate series unavailable for this central bank.</p>
        <p className="desk-rates__chart-hint">Sync calendar — policy decisions populate the path from release history.</p>
      </div>
    );
  }

  const w = 280;
  const h = 108;
  const values = series.map((p) => p.value);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const pad = Math.max(0.25, (dataMax - dataMin) * 0.15);
  const min = Math.max(0, dataMin - pad);
  const max = dataMax + pad;
  const step = w / Math.max(values.length - 1, 1);

  const d = values
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / (max - min || 1)) * (h - 16) - 8;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');

  const ticks = [];
  const tickStep = max - min <= 1 ? 0.25 : max - min <= 3 ? 0.5 : 1;
  for (let t = Math.ceil(min / tickStep) * tickStep; t <= max + 0.001; t += tickStep) {
    ticks.push(Number(t.toFixed(2)));
    if (ticks.length >= 5) break;
  }

  return (
    <div className="insidr-desk-bias__rate-chart desk-rates__chart">
      {label && <p className="desk-panel-muted desk-fed-label">{label}</p>}
      <svg viewBox={`0 0 ${w} ${h}`} className="insidr-desk-bias__rate-chart-svg" aria-hidden>
        {ticks.map((tick) => {
          const y = h - ((tick - min) / (max - min || 1)) * (h - 16) - 8;
          return (
            <g key={tick}>
              <line x1="0" y1={y} x2={w} y2={y} stroke="rgba(255,255,255,0.06)" />
              <text x="0" y={y - 2} fill="#64748b" fontSize="8">
                {tick}%
              </text>
            </g>
          );
        })}
        <path d={d} fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" />
        {values.length > 0 && (
          <circle
            cx={(values.length - 1) * step}
            cy={h - ((values[values.length - 1] - min) / (max - min || 1)) * (h - 16) - 8}
            r="3.5"
            fill="#c4b5fd"
            stroke="#1e1b4b"
            strokeWidth="1.5"
          />
        )}
      </svg>
      <div className="insidr-desk-bias__rate-chart-labels">
        {series
          .filter((_, i) => i % 2 === 0 || i === series.length - 1)
          .map((p) => (
            <span key={`${p.label}-${p.value}`}>{p.label}</span>
          ))}
      </div>
      <div className="desk-rates__chart-foot">
        {latestRate != null && (
          <span className="desk-fed-latest">
            Latest: <strong>{latestRate}%</strong>
          </span>
        )}
        {source && <span className="desk-rates__source-badge">{formatRateSource(source)}</span>}
      </div>
    </div>
  );
}

const DeskRatesTab = ({ deskData, loading, onRefresh, symbol = 'XAUUSD', prices = {}, onSelectAsset }) => {
  const [centralBank, setCentralBank] = useState('US');
  const [economyDetail, setEconomyDetail] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [rateSeries, setRateSeries] = useState(null);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [economyLoading, setEconomyLoading] = useState(false);
  const [calLoading, setCalLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [analysisKey, setAnalysisKey] = useState(null);

  const eventRowKey = (ev) =>
    String(ev.id || `${ev.event_time}-${ev.event_name || ev.title || ev.event}`);

  const bank = CENTRAL_BANKS.find((b) => b.id === centralBank) || CENTRAL_BANKS[0];

  const bootSynced = useRef(false);

  const loadCalendar = useCallback(async () => {
    setCalLoading(true);
    setSyncError('');
    try {
      const from = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000);
      const to = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000);
      const res = await api.calendar.getEvents({
        limit: 500,
        from: from.toISOString(),
        to: to.toISOString(),
      });
      if (res?.success && Array.isArray(res.data)) {
        setCalendarEvents(res.data);
        if (!bootSynced.current && res.data.length < 5) {
          bootSynced.current = true;
          try {
            await api.calendar.sync({});
            const reload = await api.calendar.getEvents({
              limit: 500,
              from: from.toISOString(),
              to: to.toISOString(),
            });
            if (reload?.success && Array.isArray(reload.data)) {
              setCalendarEvents(reload.data);
            }
          } catch {
            /* sync optional */
          }
        }
      } else {
        setCalendarEvents([]);
      }
    } catch (e) {
      setSyncError(e.error || 'Could not load calendar.');
      setCalendarEvents([]);
    } finally {
      setCalLoading(false);
    }
  }, []);

  const loadRateSeries = useCallback(async (country) => {
    setSeriesLoading(true);
    try {
      const res = await api.desk.getRateSeries(country);
      if (res?.success && res.data) {
        setRateSeries(res.data);
      } else {
        setRateSeries(null);
      }
    } catch {
      setRateSeries(null);
    } finally {
      setSeriesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCalendar();
    const id = setInterval(loadCalendar, 60000);
    return () => clearInterval(id);
  }, [loadCalendar]);

  useEffect(() => {
    setEconomyLoading(true);
    api.desk
      .getEconomy(centralBank)
      .then((res) => setEconomyDetail(res?.success ? res.data : null))
      .catch(() => setEconomyDetail(null))
      .finally(() => setEconomyLoading(false));
  }, [centralBank]);

  useEffect(() => {
    loadRateSeries(centralBank);
    const id = setInterval(() => loadRateSeries(centralBank), 900000);
    return () => clearInterval(id);
  }, [centralBank, loadRateSeries]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncError('');
    try {
      const syncRes = await api.calendar.sync({});
      if (!syncRes?.success) setSyncError(syncRes?.error || 'Sync failed.');
      await loadCalendar();
      await loadRateSeries(centralBank);
      onRefresh?.();
    } catch (e) {
      setSyncError(e.error || 'Sync failed — run npm run dev:all');
    } finally {
      setSyncing(false);
    }
  }, [loadCalendar, loadRateSeries, centralBank, onRefresh]);

  const allDecisions = useMemo(() => {
    const fromDesk = deskData?.rateRows?.rows || [];
    const fromCal = mapCalendarToRateRows(calendarEvents);
    const byKey = new Map();
    for (const row of [...fromDesk, ...fromCal]) {
      byKey.set(`${row.event_time}-${row.decision}`, row);
    }
    return [...byKey.values()].sort((a, b) => new Date(a.event_time) - new Date(b.event_time));
  }, [deskData?.rateRows?.rows, calendarEvents]);

  const bankDecisions = useMemo(
    () => allDecisions.filter((r) => String(r.country).toUpperCase() === bank.id),
    [allDecisions, bank.id],
  );

  const cbEvents = useMemo(
    () => filterCbEvents(calendarEvents, bank),
    [calendarEvents, bank],
  );

  const resolvedRateSeries = useMemo(
    () =>
      resolveRateSeries({
        apiSeries: rateSeries,
        calendarEvents,
        country: centralBank,
        deskFedSeries: deskData?.fedSeries,
      }),
    [rateSeries, calendarEvents, centralBank, deskData?.fedSeries],
  );

  const stance = useMemo(
    () => stanceFromEconomy(economyDetail, resolvedRateSeries),
    [economyDetail, resolvedRateSeries],
  );

  const policySummary = useMemo(() => {
    if (economyLoading) return 'Loading policy read…';
    if (economyDetail?.interpretation) return economyDetail.interpretation;
    if (economyDetail?.nextEvent) {
      const n = economyDetail.nextEvent;
      return `${bank.label} desk: next release "${n.event}" (${new Date(n.event_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}). ${economyDetail.eventCount || 0} events in the macro window.`;
    }
    return `${bank.label} macro window — sync calendar for live policy releases and country interpretation.`;
  }, [economyLoading, economyDetail, bank.label]);

  if (loading && !deskData && calLoading) {
    return (
      <div className="desk-rates" role="tabpanel">
        <DeskPanelSkeleton rows={4} />
        <DeskPanelSkeleton rows={3} />
      </div>
    );
  }

  return (
    <div className="desk-rates" role="tabpanel">
      <div className="insidr-desk-bias__section-head">
        <h3 className="insidr-desk-bias__section-title">Central bank decisions (calendar)</h3>
        <div className="desk-rates__head-actions">
          <button
            type="button"
            className="desk-rates__sync-btn"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Sync
          </button>
          {onRefresh && (
            <button type="button" className="desk-panel-refresh" onClick={onRefresh} aria-label="Refresh">
              <RefreshCw size={12} />
            </button>
          )}
          <Link to="/dashboard/calendar" className="insidr-desk-bias__view-all">
            View all <ArrowRight size={11} />
          </Link>
        </div>
      </div>

      {syncError && <p className="desk-rates__sync-error">{syncError}</p>}

      {calLoading && !allDecisions.length ? (
        <DeskPanelSkeleton rows={4} />
      ) : allDecisions.length === 0 ? (
        <div className="desk-rates__empty">
          <p className="desk-panel-muted desk-panel-muted--block">
            No upcoming rate decisions in the economic calendar.
          </p>
          <button type="button" className="desk-rates__sync-link" onClick={handleSync} disabled={syncing}>
            Sync calendar for FOMC, ECB, BoE releases <ArrowRight size={11} />
          </button>
        </div>
      ) : (
        <div className="insidr-desk-bias__rates-table-wrap custom-scrollbar">
          <table className="insidr-desk-bias__rates-table">
            <thead>
              <tr>
                <th>Central bank decision</th>
                <th>CB</th>
                <th>Trend</th>
                <th>Date</th>
                <th>Forecast / consensus</th>
                <th>Prior</th>
              </tr>
            </thead>
            <tbody>
              {allDecisions.map((row) => (
                <tr
                  key={`${row.event_time}-${row.decision}`}
                  className={String(row.country).toUpperCase() === bank.id ? 'desk-rates__row--active-bank' : ''}
                >
                  <td className="insidr-desk-bias__rates-decision">{row.decision}</td>
                  <td>
                    <span className="desk-rates__cb-pill">{row.country}</span>
                  </td>
                  <td>
                    {row.trend?.length >= 2 ? (
                      <DeskSparkline values={row.trend} variant="purple" />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="insidr-desk-bias__rates-date">{row.date}</td>
                  <td>
                    <span className="insidr-desk-bias__outcome insidr-desk-bias__outcome--neutral">
                      {row.outcome}
                    </span>
                  </td>
                  <td className="insidr-desk-bias__rates-date">{row.previous ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="desk-rates__cb">
        <div className="insidr-desk-bias__section-head desk-rates__cb-head">
          <h3 className="insidr-desk-bias__section-title">Central Bank Events</h3>
          <span className="desk-rates__live-tag">Live calendar</span>
        </div>

        <div className="insidr-desk-bias__bank-tabs">
          {CENTRAL_BANKS.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`insidr-desk-bias__bank-tab ${centralBank === b.id ? 'insidr-desk-bias__bank-tab--on' : ''}`}
              onClick={() => setCentralBank(b.id)}
            >
              <span className="insidr-desk-bias__bank-code">{b.code}</span>
            </button>
          ))}
        </div>

        <p className="insidr-desk-bias__bank-summary">{policySummary}</p>

        {bankDecisions.length > 0 && (
          <div className="desk-rates__bank-next">
            <span className="desk-rates__bank-next-label">Next {bank.code} decision</span>
            <strong>{bankDecisions[0].decision}</strong>
            <span className="desk-rates__bank-next-date">{bankDecisions[0].date}</span>
          </div>
        )}

        <div className="insidr-desk-bias__cb-grid">
          <div className="insidr-desk-bias__cb-chart-col">
            <div className="insidr-desk-bias__cb-chart-head">
              <span className="insidr-desk-bias__cb-label">RATE PATH (LIVE)</span>
              <span className={`insidr-desk-bias__stance insidr-desk-bias__stance--${stance.tone}`}>
                {stance.label}
              </span>
            </div>
            <RatePathChart
              series={resolvedRateSeries?.series}
              latestRate={resolvedRateSeries?.latestRate}
              label={resolvedRateSeries?.label}
              source={resolvedRateSeries?.source}
              loading={seriesLoading && !resolvedRateSeries?.series?.length}
            />
          </div>

          <div className="insidr-desk-bias__cb-events-col">
            <div className="insidr-desk-bias__cb-events-head">
              <span className="insidr-desk-bias__cb-label">UPCOMING · {bank.code}</span>
              <span className="insidr-desk-bias__cb-count">{cbEvents.length}</span>
            </div>
            <div className="insidr-desk-bias__cb-events-scroll custom-scrollbar">
              {cbEvents.length === 0 ? (
                <p className="insidr-desk-bias__muted">No {bank.code} events in the next 14 days.</p>
              ) : (
                cbEvents.map((ev) => {
                  const rowKey = eventRowKey(ev);
                  const analysisOpen = analysisKey === rowKey;
                  return (
                  <article
                    key={rowKey}
                    className={`insidr-desk-bias__cb-event ${analysisOpen ? 'insidr-desk-bias__cb-event--analysis-open' : ''}`}
                    data-analysis-open={analysisOpen || undefined}
                  >
                    <div className="insidr-desk-bias__cb-event-top">
                      <span className="insidr-desk-bias__cb-event-time">
                        {new Date(ev.event_time).toLocaleString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="insidr-desk-bias__cb-event-ccy">{ev.country || bank.currency}</span>
                      {(ev.importance || ev.impact) && (
                        <span className={`desk-rates__impact ${impactBadgeClass(ev.importance || ev.impact)}`}>
                          {String(ev.importance || ev.impact).toUpperCase()}
                        </span>
                      )}
                      <button
                        type="button"
                        className={`insidr-desk-bias__cb-event-brain-btn ${analysisOpen ? 'insidr-desk-bias__cb-event-brain-btn--active' : ''}`}
                        aria-label={`Full Insidr analysis — ${ev.event_name || ev.title || ev.event}`}
                        title="Full Insidr analysis"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAnalysisKey((cur) => (cur === rowKey ? null : rowKey));
                        }}
                      >
                        <Brain size={13} className="insidr-desk-bias__cb-event-brain" aria-hidden />
                      </button>
                    </div>
                    <p className="insidr-desk-bias__cb-event-title">
                      {ev.event_name || ev.title || ev.event}
                    </p>
                    {(ev.forecast || ev.previous) && (
                      <p className="desk-rates__event-meta">
                        {ev.forecast ? `Fcst ${ev.forecast}` : ''}
                        {ev.forecast && ev.previous ? ' · ' : ''}
                        {ev.previous ? `Prev ${ev.previous}` : ''}
                      </p>
                    )}
                    {analysisOpen && (
                      <DeskEventAnalysisPanel
                        event={ev}
                        symbol={symbol}
                        prices={prices}
                        compact
                        onClose={() => setAnalysisKey(null)}
                        onSelectAsset={onSelectAsset}
                      />
                    )}
                  </article>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default DeskRatesTab;
