import React, { useEffect, useState } from 'react';
import { api } from '../../services/api/api.js';
import { formatCountdownMinutes } from '../../utils/displayFormat.js';

const MrktChartEventBadge = ({ symbol, onClick }) => {
  const [count, setCount] = useState(0);
  const [minutes, setMinutes] = useState(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      const from = new Date();
      const to = new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000);
      api.calendar
        .getEvents({
          from: from.toISOString(),
          to: to.toISOString(),
          country: 'US',
          importance: 'HIGH',
          limit: 30,
        })
        .then((res) => {
          if (!active) return;
          const rows = res?.data || [];
          const now = Date.now();
          const upcoming = rows.filter((e) => new Date(e.event_time).getTime() >= now - 60000);
          setCount(upcoming.length);
          const next = upcoming[0];
          if (next?.event_time) {
            const mins = Math.round((new Date(next.event_time).getTime() - now) / 60000);
            setMinutes(mins);
          } else {
            setMinutes(null);
          }
        })
        .catch(() => {
          if (active) {
            setCount(0);
            setMinutes(null);
          }
        });
    };
    load();
    const id = setInterval(load, 20000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [symbol]);

  return (
    <button
      type="button"
      className="mrkt-chart-event-badge"
      onClick={onClick}
      aria-label={`${count} upcoming macro events. Open calendar.`}
    >
      <span className="mrkt-chart-event-badge__ring">
        <span className="mrkt-chart-event-badge__dot" aria-hidden />
      </span>
      <span className="mrkt-chart-event-badge__text">
        <strong>
          {count} event{count === 1 ? '' : 's'}
        </strong>
        <span>{formatCountdownMinutes(minutes)}</span>
      </span>
    </button>
  );
};

export default MrktChartEventBadge;
