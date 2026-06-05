import React from 'react';
import { Brain, Info } from 'lucide-react';

const flagCode = (country) => {
  const c = String(country || '').toLowerCase();
  if (c === 'eu') return 'eu';
  return c.slice(0, 2);
};

const currencyCode = (event) => {
  if (event.currency) return event.currency;
  const c = String(event.country || '').toUpperCase();
  const map = { US: 'USD', EU: 'EUR', GB: 'GBP', JP: 'JPY', AU: 'AUD', CA: 'CAD', CH: 'CHF', NZ: 'NZD', CN: 'CNY' };
  return map[c] || c.slice(0, 3);
};

const formatTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const formatDayHeader = (dayKey) => {
  const d = new Date(`${dayKey}T12:00:00Z`);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
};

function impactClass(imp) {
  const u = String(imp || 'LOW').toUpperCase();
  if (u === 'HIGH') return 'high';
  if (u === 'MEDIUM') return 'med';
  if (u === 'NONE') return 'none';
  return 'low';
}

function impactLabel(imp) {
  const u = String(imp || 'LOW').toUpperCase();
  if (u === 'HIGH') return 'High';
  if (u === 'MEDIUM') return 'Med';
  if (u === 'NONE') return 'None';
  return 'Low';
}

function DataCell({ value, className = '', surprise = false }) {
  const empty = value == null || value === '' || value === '—' || value === '-';
  return (
    <td className={`econ-cal-pro__data ${surprise ? 'econ-cal-pro__data--surprise' : ''} ${className}`.trim()}>
      {empty ? '' : value}
    </td>
  );
}

const EconomicCalendarProTable = ({
  groupedDays,
  loading,
  loadError,
  onSync,
  syncing,
  insightIds,
  onBrainClick,
}) => {
  if (loading) {
    return (
      <div className="econ-cal-pro__loading">
        {Array(10)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="econ-cal-pro__skel" />
          ))}
      </div>
    );
  }

  if (!groupedDays.length) {
    return (
      <div className="econ-cal-pro__empty">
        <p>No events for this window.</p>
        {loadError ? <p className="econ-cal-pro__empty-sub">{loadError}</p> : null}
        <button type="button" onClick={onSync} disabled={syncing} className="economic-cal__pro-btn">
          {syncing ? 'Syncing…' : 'Sync calendar'}
        </button>
      </div>
    );
  }

  return (
    <div className="econ-cal-pro__scroll custom-scrollbar">
      <table className="economic-cal__pro-table econ-cal-pro__table">
        <thead>
          <tr>
            <th className="econ-cal-pro__th-time">Time</th>
            <th>Impact</th>
            <th>Ccy</th>
            <th>Event</th>
            <th className="econ-cal-pro__th-brain" aria-label="Analysis" />
            <th className="econ-cal-pro__th-num">Actual</th>
            <th className="econ-cal-pro__th-num">Forecast</th>
            <th className="econ-cal-pro__th-num">
              Bank Forecast <Info size={10} className="inline opacity-50" aria-hidden />
            </th>
            <th className="econ-cal-pro__th-num">Prior</th>
            <th className="econ-cal-pro__th-num">Min</th>
            <th className="econ-cal-pro__th-num">Max</th>
          </tr>
        </thead>
        <tbody>
          {groupedDays.map(([dayKey, dayEvents]) => (
            <React.Fragment key={dayKey}>
              <tr className="econ-cal-pro__day-row" data-day={dayKey}>
                <td colSpan={11}>{formatDayHeader(dayKey)}</td>
              </tr>
              {dayEvents.map((event, idx) => {
                const rowKey = event.id || `${dayKey}-${idx}`;
                const prevTime = idx > 0 ? dayEvents[idx - 1].event_time : null;
                const showTime =
                  !prevTime ||
                  formatTime(prevTime) !== formatTime(event.event_time);
                const isSurprise =
                  event.actual != null &&
                  event.forecast != null &&
                  parseFloat(event.actual) > parseFloat(event.forecast);
                const active = insightIds.has(rowKey);

                return (
                  <tr key={rowKey} className={active ? 'econ-cal-pro__row--active' : ''}>
                    <td className="econ-cal-pro__time">{showTime ? formatTime(event.event_time) : ''}</td>
                    <td>
                      <span className={`econ-cal-pro__impact econ-cal-pro__impact--${impactClass(event.importance)}`}>
                        <span className="econ-cal-pro__impact-dot" aria-hidden />
                        {impactLabel(event.importance)}
                      </span>
                    </td>
                    <td>
                      <span className="economic-cal__ccy">
                        <img
                          src={`https://flagcdn.com/w40/${flagCode(event.country)}.png`}
                          alt=""
                          className="econ-cal-pro__flag"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        {currencyCode(event)}
                      </span>
                    </td>
                    <td className="econ-cal-pro__event">{event.event_name}</td>
                    <td className="econ-cal-pro__brain-cell">
                      <button
                        type="button"
                        className={`economic-cal__brain ${active ? 'is-active' : ''}`}
                        title="Insidr desk read"
                        onClick={() => onBrainClick(event, rowKey)}
                      >
                        <Brain size={14} />
                      </button>
                    </td>
                    <DataCell value={event.actual} surprise={isSurprise} />
                    <DataCell value={event.forecast} />
                    <DataCell value={event.bank_forecast} />
                    <DataCell value={event.previous} />
                    <DataCell value={event.forecast_min ?? event.min} />
                    <DataCell value={event.forecast_max ?? event.max} />
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EconomicCalendarProTable;
