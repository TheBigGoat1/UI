import React, { useEffect, useState } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';
import { api } from '../../services/api/api.js';

const WeeklyDebriefPanel = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.trader
      .getDebrief()
      .then((res) => {
        if (active && res?.success) setData(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="debrief-panel flex items-center gap-2 text-text-muted text-sm">
        <Loader2 size={16} className="animate-spin" /> Loading weekly debrief…
      </div>
    );
  }
  if (!data) return null;

  return (
    <section className="debrief-panel">
      <div className="debrief-panel__head">
        <BarChart3 size={18} className="text-primary" />
        <h3>Weekly debrief</h3>
        <span className="text-[10px] text-text-muted uppercase">{data.periodDays}d</span>
      </div>
      <div className="debrief-panel__stats">
        <div>
          <span className="label">Trades</span>
          <span className="value">{data.trades}</span>
        </div>
        <div>
          <span className="label">Win rate</span>
          <span className="value">{data.winRate != null ? `${data.winRate}%` : '—'}</span>
        </div>
        <div>
          <span className="label">P&amp;L</span>
          <span className={`value ${data.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {data.totalPnl >= 0 ? '+' : ''}${data.totalPnl}
          </span>
        </div>
        <div>
          <span className="label">Plan followed</span>
          <span className="value">{data.planFollowed}</span>
        </div>
        <div>
          <span className="label">Rule breaks</span>
          <span className="value text-amber-400">{data.ruleBreaks}</span>
        </div>
      </div>
      <p className="debrief-panel__insight">{data.insight}</p>
    </section>
  );
};

export default WeeklyDebriefPanel;
