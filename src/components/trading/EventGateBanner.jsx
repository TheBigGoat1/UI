import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarDays } from 'lucide-react';
import { api } from '../../services/api/api.js';

const EventGateBanner = ({ symbol, className = '' }) => {
  const [gate, setGate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.trader
      .getEventGate(symbol)
      .then((res) => {
        if (active && res?.success) setGate(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [symbol]);

  if (loading || !gate?.warning || !gate?.nextEvent) return null;

  const mins = gate.minutesUntil ?? 0;
  const ev = gate.nextEvent;
  const blocked = gate.blocked;

  return (
    <div
      className={`rounded-xl border px-4 py-3 flex flex-wrap items-start gap-3 ${
        blocked
          ? 'border-red-500/40 bg-red-500/10'
          : 'border-amber-500/35 bg-amber-500/10'
      } ${className}`}
      role="status"
    >
      <AlertTriangle
        size={18}
        className={blocked ? 'text-red-400 shrink-0 mt-0.5' : 'text-amber-400 shrink-0 mt-0.5'}
      />
      <div className="flex-1 min-w-[200px]">
        <p className={`text-sm font-bold ${blocked ? 'text-red-300' : 'text-amber-200'}`}>
          {blocked ? 'Event gate — high-impact macro nearby' : 'Macro event window open'}
        </p>
        <p className="text-xs text-text-muted mt-1">
          <strong className="text-text-main">{ev.name}</strong>
          {ev.country ? ` (${ev.country})` : ''} in{' '}
          <span className="font-mono text-text-main">{mins}m</span>
          {symbol ? ` · relevant to ${symbol}` : ''}
          {gate.eventCount > 1 ? ` · +${gate.eventCount - 1} more in window` : ''}
        </p>
        <p className="text-[10px] text-text-muted mt-1">
          {blocked
            ? 'Consider reducing size or waiting until after the release.'
            : 'Review calendar before adding risk.'}
        </p>
      </div>
      <Link
        to="/dashboard/calendar"
        className="text-xs font-bold text-primary hover:underline flex items-center gap-1 shrink-0"
      >
        <CalendarDays size={14} /> Calendar
      </Link>
    </div>
  );
};

export default EventGateBanner;
