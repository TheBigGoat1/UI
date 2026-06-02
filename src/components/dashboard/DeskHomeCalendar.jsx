import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Brain,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { api } from '../../services/api/api.js';
import DeskEventAnalysisPanel from './DeskEventAnalysisPanel.jsx';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function flagCode(country) {
  const c = String(country || '').toLowerCase();
  if (c === 'eu') return 'eu';
  return c.slice(0, 2);
}

function countryHintForSymbol(symbol) {
  const s = String(symbol || '').toUpperCase();
  if (/EUR|EURO|DE30|GER/.test(s)) return 'EU';
  if (/GBP|UK100|FTSE/.test(s)) return 'GB';
  if (/JPY|JP225|NI225/.test(s)) return 'JP';
  if (/AUD|ASX/.test(s)) return 'AU';
  if (/CAD/.test(s)) return 'CA';
  if (/CHF|SWI/.test(s)) return 'CH';
  if (/NZD/.test(s)) return 'NZ';
  if (/CNY|CN50/.test(s)) return 'CN';
  return 'US';
}

function formatTimeUtc(iso) {
  const d = new Date(iso);
  return `${d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })} UTC`;
}

function formatDateHeader(iso) {
  const d = new Date(iso);
  return d
    .toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    })
    .toUpperCase();
}

function toDayKey(iso) {
  return String(iso).slice(0, 10);
}

function cellValue(val) {
  if (val == null || val === '') return '—';
  return String(val);
}

function impactClass(imp) {
  const u = String(imp || '').toUpperCase();
  if (u === 'HIGH') return 'desk-home-cal__impact--high';
  if (u === 'MEDIUM') return 'desk-home-cal__impact--med';
  return 'desk-home-cal__impact--low';
}

/**
 * Home desk calendar — MRKT reference: month release table only (no grid/stats/toolbar).
 */
const DeskHomeCalendar = ({ symbol = 'XAUUSD', prices = {}, onSelectAsset, onEventInsight }) => {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [expandedKey, setExpandedKey] = useState(null);
  const [insightEvent, setInsightEvent] = useState(null);
  const bootSynced = useRef(false);

  const country = countryHintForSymbol(symbol);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await api.calendar.getEvents({
        limit: 500,
        year,
        month: month + 1,
        country,
        importance: 'HIGH',
      });
      if (res?.success) {
        setEvents(Array.isArray(res.data) ? res.data : []);
      } else {
        setEvents([]);
        setLoadError(res?.error || 'Could not load calendar events.');
      }
    } catch (e) {
      setEvents([]);
      setLoadError(e.error || e.message || 'API offline — run npm run dev:all');
    } finally {
      setLoading(false);
    }
  }, [year, month, country]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setLoadError('');
    try {
      const res = await api.calendar.sync();
      if (!res?.success) {
        setLoadError(res?.error || 'Calendar sync failed.');
        return;
      }
      await loadData();
    } catch (e) {
      setLoadError(e.error || 'Calendar sync failed.');
    } finally {
      setSyncing(false);
    }
  }, [loadData]);

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, 60000);
    return () => clearInterval(id);
  }, [loadData]);

  useEffect(() => {
    if (loading || loadError || bootSynced.current || events.length > 0) return;
    bootSynced.current = true;
    (async () => {
      try {
        const health = await api.system.getHealth();
        if (health?.success) handleSync();
      } catch {
        /* offline */
      }
    })();
  }, [loading, events.length, loadError, handleSync]);

  const grouped = useMemo(() => {
    const groups = {};
    for (const ev of events) {
      const key = toDayKey(ev.event_time);
      if (!groups[key]) groups[key] = [];
      groups[key].push(ev);
    }
    for (const key of Object.keys(groups)) {
      groups[key].sort(
        (a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime(),
      );
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  const periodLabel = `${MONTH_NAMES[month]} ${year} releases`;

  const toggleRow = (rowKey) => {
    setExpandedKey((cur) => (cur === rowKey ? null : rowKey));
    setInsightEvent(null);
  };

  const insightRowKey = (event, dayKey, idx) =>
    event.id || `${dayKey}-${idx}`;

  const eventMatchesInsight = (a, b) =>
    a &&
    b &&
    (a.id === b.id ||
      `${a.event_time}-${a.event_name}` === `${b.event_time}-${b.event_name}`);

  const openInsight = (event, rowKey, e) => {
    e?.stopPropagation();
    if (eventMatchesInsight(insightEvent, event)) {
      setInsightEvent(null);
      return;
    }
    setExpandedKey(rowKey);
    setInsightEvent(event);
    onEventInsight?.(event);
  };

  return (
    <div className="desk-home-cal" role="tabpanel" aria-label="Economic calendar releases">
      <header className="desk-home-cal__top">
        <h3 className="desk-home-cal__period">{periodLabel}</h3>
        <span className="desk-home-cal__legend">TIMES IN UTC · ACTUAL / FORECAST / PREVIOUS</span>
      </header>

      {loadError && (
        <div className="desk-home-cal__error" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={loadData}>
            Retry
          </button>
        </div>
      )}

      <div className="desk-home-cal__body custom-scrollbar">
        {loading ? (
          <div className="desk-home-cal__loading">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="desk-home-cal__skel-row" />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="desk-home-cal__empty">
            <p>No high-impact {country} releases for {MONTH_NAMES[month]} {year}.</p>
            <button type="button" className="desk-home-cal__sync" onClick={handleSync} disabled={syncing}>
              {syncing ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Syncing…
                </>
              ) : (
                <>
                  <RefreshCw size={14} /> Sync calendar
                </>
              )}
            </button>
          </div>
        ) : (
          grouped.map(([dayKey, dayEvents]) => (
            <section key={dayKey} className="desk-home-cal__day">
              <div className="desk-home-cal__date-bar">
                <h4 className="desk-home-cal__date-title">{formatDateHeader(dayKey)}</h4>
                <p className="desk-home-cal__date-count">
                  {dayEvents.length} release{dayEvents.length === 1 ? '' : 's'}
                </p>
              </div>

              <table className="desk-home-cal__table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Event</th>
                    <th>Impact</th>
                    <th>Actual</th>
                    <th>Forecast</th>
                    <th>Previous</th>
                    <th aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {dayEvents.map((event, idx) => {
                    const rowKey = insightRowKey(event, dayKey, idx);
                    const open = expandedKey === rowKey;
                    const showInsight =
                      insightEvent &&
                      (insightEvent.id === event.id ||
                        `${insightEvent.event_time}-${insightEvent.event_name}` ===
                          `${event.event_time}-${event.event_name}`);
                    return (
                      <React.Fragment key={rowKey}>
                        <tr
                          className={`desk-home-cal__row ${open ? 'desk-home-cal__row--open' : ''}`}
                          onClick={() => toggleRow(rowKey)}
                        >
                          <td className="desk-home-cal__time">{formatTimeUtc(event.event_time)}</td>
                          <td className="desk-home-cal__event">
                            <img
                              src={`https://flagcdn.com/w40/${flagCode(event.country)}.png`}
                              alt=""
                              className="desk-home-cal__flag"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                            <span className="desk-home-cal__event-name">
                              {event.event_name || event.event}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`desk-home-cal__impact ${impactClass(event.importance || event.impact)}`}
                            >
                              {String(event.importance || event.impact || '—').toUpperCase()}
                            </span>
                          </td>
                          <td className="desk-home-cal__num">{cellValue(event.actual)}</td>
                          <td className="desk-home-cal__num">{cellValue(event.forecast)}</td>
                          <td className="desk-home-cal__num">{cellValue(event.previous)}</td>
                          <td className="desk-home-cal__chev">
                            {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </td>
                        </tr>
                        {open && (
                          <tr className="desk-home-cal__expand">
                            <td colSpan={7}>
                              <div className="desk-home-cal__expand-inner">
                                <p className="desk-home-cal__expand-copy">
                                  {event.description ||
                                    event.analyst_note ||
                                    `High-impact ${event.country || country} release — watch ${symbol} around the print.`}
                                </p>
                                <button
                                  type="button"
                                  className="desk-home-cal__insight-btn"
                                  onClick={(e) => openInsight(event, rowKey, e)}
                                >
                                  <Brain size={13} />
                                  {showInsight ? 'Hide analysis' : 'Full Insidr analysis'}
                                </button>
                                {showInsight && (
                                  <DeskEventAnalysisPanel
                                    event={event}
                                    symbol={symbol}
                                    prices={prices}
                                    onClose={() => setInsightEvent(null)}
                                    onSelectAsset={onSelectAsset}
                                  />
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </section>
          ))
        )}
      </div>

      <footer className="desk-home-cal__foot">
        <Link to="/dashboard/calendar" className="desk-home-cal__full-link">
          Full calendar <ArrowRight size={11} />
        </Link>
        <button type="button" className="desk-home-cal__refresh" onClick={loadData} aria-label="Refresh">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </footer>
    </div>
  );
};

export default DeskHomeCalendar;
