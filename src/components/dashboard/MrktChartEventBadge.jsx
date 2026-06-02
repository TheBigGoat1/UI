import React, { useEffect, useState } from 'react';
import { api } from '../../services/api/api.js';

function formatCountdown(minutes) {
  if (minutes == null || minutes < 0) return '—';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const MrktChartEventBadge = ({ symbol, onClick }) => {
  const [gate, setGate] = useState(null);

  useEffect(() => {
    if (!symbol) return;
    let active = true;
    const load = () => {
      api.trader
        .getEventGate(symbol)
        .then((res) => {
          if (active && res?.success) setGate(res.data);
        })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [symbol]);

  const count = gate?.eventCount ?? (gate?.nextEvent ? 1 : 0);
  if (!count && !gate?.warning) return null;

  const mins = gate?.minutesUntil;

  return (
    <button
      type="button"
      className="mrkt-chart-event-badge"
      onClick={onClick}
      aria-label={`${count} upcoming macro events — open calendar`}
    >
      <span className="mrkt-chart-event-badge__ring">
        <span className="mrkt-chart-event-badge__dot" />
      </span>
      <span className="mrkt-chart-event-badge__text">
        <strong>{count} events</strong>
        <span>{formatCountdown(mins)}</span>
      </span>
    </button>
  );
};

export default MrktChartEventBadge;
