import React from 'react';
import { Check, Minus } from 'lucide-react';

const ROWS = [
  { feature: 'MRKT terminal (chart + headline)', free: true, pro: true, elite: true },
  { feature: 'News feed (read)', free: true, pro: true, elite: true },
  { feature: 'Chart labels & callouts', free: false, pro: true, elite: true },
  { feature: 'Target & pullback levels', free: false, pro: true, elite: true },
  { feature: 'Calendar events on chart', free: false, pro: true, elite: true },
  { feature: 'News AI insights (brain)', free: false, pro: true, elite: true },
  { feature: 'Browse saved ideas', free: true, pro: true, elite: true },
  { feature: 'Manual journal entries', free: true, pro: true, elite: true },
  { feature: 'AI idea generation', free: false, pro: true, elite: true },
  { feature: 'Strategy backtest lab', free: false, pro: true, elite: true },
  { feature: 'Accept & track positions', free: 'Limited', pro: true, elite: true },
  { feature: 'Book heat & event gates', free: false, pro: true, elite: true },
  { feature: 'Advanced AI chat', free: false, pro: false, elite: true },
  { feature: 'Priority support', free: false, pro: false, elite: true },
];

const Cell = ({ value }) => {
  if (value === true) {
    return <Check size={16} className="text-emerald-500 mx-auto" aria-label="Included" />;
  }
  if (value === false) {
    return <Minus size={16} className="text-text-muted/40 mx-auto" aria-label="Not included" />;
  }
  return <span className="text-[10px] font-bold text-text-muted">{value}</span>;
};

const PlanFeatureMatrix = () => (
  <div className="overflow-x-auto rounded-xl border border-border">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-background/50 text-left">
          <th className="px-4 py-3 font-bold text-text-muted text-xs uppercase tracking-wider">
            Feature
          </th>
          <th className="px-4 py-3 font-bold text-center text-xs">Free</th>
          <th className="px-4 py-3 font-bold text-center text-xs text-primary">Pro</th>
          <th className="px-4 py-3 font-bold text-center text-xs text-primary">Elite</th>
        </tr>
      </thead>
      <tbody>
        {ROWS.map((row) => (
          <tr key={row.feature} className="border-b border-border/60 last:border-0">
            <td className="px-4 py-2.5 text-text-main">{row.feature}</td>
            <td className="px-4 py-2.5 text-center">
              <Cell value={row.free} />
            </td>
            <td className="px-4 py-2.5 text-center bg-primary/5">
              <Cell value={row.pro} />
            </td>
            <td className="px-4 py-2.5 text-center">
              <Cell value={row.elite} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default PlanFeatureMatrix;
