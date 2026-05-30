import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Settings } from 'lucide-react';
import { api } from '../../services/api/api.js';

const BookHeatMeter = () => {
  const [heat, setHeat] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.trader
      .getHeat()
      .then((res) => {
        if (!active) return;
        if (res?.success && res.data?.heat) setHeat(res.data.heat);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const used = Number(heat?.heatPercent ?? 0);
  const max = Number(heat?.maxHeatPercent ?? 3);
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;
  const over = Boolean(heat?.overHeat);
  const openCount = heat?.openCount ?? 0;

  return (
    <div className="dash-panel">
      <div className="dash-panel__body p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
            <Flame size={14} className="text-primary" />
            Book heat
          </h3>
          <Link
            to="/dashboard/settings?tab=trading"
            className="text-[10px] text-primary font-bold hover:underline flex items-center gap-1"
          >
            <Settings size={10} /> Risk settings
          </Link>
        </div>

        {loading ? (
          <div className="h-2 rounded-full bg-surface animate-pulse" />
        ) : (
          <>
            <div className="flex justify-between text-sm font-mono mb-2">
              <span className={over ? 'text-red-400 font-bold' : 'text-text-main'}>
                {used.toFixed(2)}%
              </span>
              <span className="text-text-muted">max {max}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-surface overflow-hidden mb-2">
              <div
                className={`h-full transition-all duration-500 ${
                  over ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[10px] text-text-muted">
              {openCount} open position{openCount === 1 ? '' : 's'} · sum of risk if all stops hit
              {over ? ' · over limit — size down or close exposure' : ''}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default BookHeatMeter;
