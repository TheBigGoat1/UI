import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, ListChecks, X } from 'lucide-react';
import { api } from '../../services/api/api.js';

const DISMISS_KEY = 'insidr_setup_checklist_dismissed';

const SetupChecklist = ({ showWelcome = false }) => {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === 'true');
  const [steps, setSteps] = useState({
    watchlist: false,
    idea: false,
    journal: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [watchRes, ideasRes, tradesRes] = await Promise.all([
          api.trader.getWatchlist().catch(() => null),
          api.tradeIdeas.getLatest(0, 'all', false).catch(() => null),
          api.journal.getTrades().catch(() => null),
        ]);
        if (cancelled) return;
        const watchlist = Array.isArray(watchRes?.data) ? watchRes.data.length > 0 : false;
        const ideas = Array.isArray(ideasRes?.data) ? ideasRes.data.length > 0 : false;
        const journal = Array.isArray(tradesRes?.data) ? tradesRes.data.length > 0 : false;
        setSteps({ watchlist, idea: ideas, journal });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const completed = steps.watchlist && steps.idea && steps.journal;

  if (dismissed || loading || completed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  const items = [
    {
      key: 'watchlist',
      done: steps.watchlist,
      label: 'Add symbols to your watchlist',
      hint: 'Drives default charts, news, and scan alerts.',
      to: '/dashboard/settings?tab=watchlist',
    },
    {
      key: 'idea',
      done: steps.idea,
      label: 'Generate your first trade idea',
      hint: 'Run a scan from Ideas or the Overview strip.',
      to: '/dashboard/ideas',
    },
    {
      key: 'journal',
      done: steps.journal,
      label: 'Log or import a trade in Journal',
      hint: 'Track performance and equity over time.',
      to: '/dashboard/journal',
    },
  ];

  const doneCount = items.filter((item) => item.done).length;

  return (
    <div className="rounded-xl border border-border bg-background/40 px-4 py-4 mb-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <ListChecks size={20} className="text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-text-main">
              {showWelcome ? 'Get started with Insidr' : 'Finish your setup'}
            </p>
            <p className="text-sm text-text-muted mt-1">
              {doneCount} of {items.length} complete — finish these to unlock the full workflow.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-hover"
          aria-label="Dismiss checklist"
        >
          <X size={16} />
        </button>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              to={item.to}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                item.done
                  ? 'border-emerald-500/30 bg-emerald-500/5 opacity-80'
                  : 'border-border hover:border-primary/30 hover:bg-background/50'
              }`}
            >
              {item.done ? (
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Circle size={18} className="text-text-muted shrink-0 mt-0.5" />
              )}
              <span className="min-w-0">
                <span className="text-sm font-semibold text-text-main block">{item.label}</span>
                <span className="text-xs text-text-muted">{item.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SetupChecklist;
