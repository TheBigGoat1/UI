import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lightbulb, ArrowRight } from 'lucide-react';
import { api } from '../../services/api/api.js';
import { gradeLabel, GRADE_STYLES } from '../../utils/ideaDisplay.js';

const TopIdeasStrip = () => {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.tradeIdeas
      .getLatest(0, 'all', false)
      .then((res) => {
        if (!active) return;
        const list = res?.success && Array.isArray(res.data) ? res.data : [];
        const sorted = [...list]
          .filter((i) => i.status !== 'open' && i.position_status !== 'open')
          .sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0))
          .slice(0, 3);
        setIdeas(sorted);
      })
      .catch(() => setIdeas([]))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="dash-panel">
      <div className="dash-panel__body p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
            <Lightbulb size={14} className="text-primary" />
            Top ideas
          </h3>
          <Link
            to="/dashboard/ideas"
            className="text-[10px] text-primary font-bold hover:underline flex items-center gap-1"
          >
            View all <ArrowRight size={10} />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-12 rounded-lg bg-surface animate-pulse" />
            ))}
          </div>
        ) : ideas.length === 0 ? (
          <p className="text-sm text-text-muted">
            No ideas yet.{' '}
            <Link to="/dashboard/ideas" className="text-primary font-bold hover:underline">
              Generate on Ideas
            </Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {ideas.map((idea) => {
              const asset = idea.asset || idea.symbol;
              const dir = (idea.direction || '').toUpperCase();
              const isLong = dir.includes('BULL') || dir.includes('LONG') || dir.includes('BUY');
              const grade = idea.grade || 'B';
              const gradeStyle = GRADE_STYLES[grade] || GRADE_STYLES.B;
              return (
                <li key={idea.id || `${asset}-${idea.created_at}`}>
                  <Link
                    to="/dashboard/ideas"
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2.5 hover:border-primary/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-text-main">{asset}</p>
                      <p className="text-[10px] text-text-muted truncate">
                        {isLong ? 'Long' : 'Short'} · {Math.round(idea.confidence || 0)}% conf
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${gradeStyle}`}
                    >
                      {gradeLabel(grade)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TopIdeasStrip;
