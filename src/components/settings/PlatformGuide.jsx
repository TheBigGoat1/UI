import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api/api.js';
import { QUICK_START, FEATURE_GUIDE, EMPTY_STATE_GUIDE, LEGAL_REMINDERS } from '../../config/platformGuide.js';
import {
  CheckCircle2,
  AlertCircle,
  CircleDashed,
  Server,
  ArrowRight,
} from 'lucide-react';

const statusMeta = (entry) => {
  if (!entry) return { label: '—', tone: 'muted', icon: CircleDashed };
  const map = {
    ok: { label: 'OK', tone: 'ok', icon: CheckCircle2 },
    configured: { label: 'Ready', tone: 'ok', icon: CheckCircle2 },
    error: { label: 'Error', tone: 'warn', icon: AlertCircle },
    not_configured: { label: 'Add key', tone: 'muted', icon: CircleDashed },
  };
  return map[entry.status] || { label: entry.status, tone: 'muted', icon: CircleDashed };
};

const PlatformGuide = () => {
  const [sources, setSources] = useState(null);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    api.system.getDataSources().then((r) => r?.success && setSources(r.data)).catch(() => {});
    api.system.getHealth().then((r) => r?.success && setHealth(r.data)).catch(() => {});
  }, []);

  const statusRows = [
    { key: 'database', label: 'Database', src: { status: health ? 'ok' : 'error' } },
    { key: 'binance', label: 'Binance (crypto)' },
    { key: 'twelveData', label: 'Twelve Data' },
    { key: 'newsApi', label: 'NewsAPI.org' },
    { key: 'newsData', label: 'NewsData.io' },
    { key: 'coindesk', label: 'CoinDesk RSS' },
    { key: 'cryptopanic', label: 'CryptoPanic' },
    { key: 'anthropic', label: 'Anthropic AI' },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-sm font-bold text-text-main mb-3">Quick start workflow</h3>
        <ol className="space-y-3">
          {QUICK_START.map((item) => (
            <li
              key={item.step}
              className="flex gap-4 p-4 rounded-xl border border-border bg-background/30"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary font-bold text-sm">
                {item.step}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-bold text-text-main">{item.title}</span>
                  <Link
                    to={item.path}
                    className="text-xs font-bold text-primary inline-flex items-center gap-1 hover:underline"
                  >
                    Open <ArrowRight size={12} />
                  </Link>
                </div>
                <p className="text-sm text-text-muted leading-relaxed">{item.action}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h3 className="text-sm font-bold text-text-main mb-2">When a screen looks empty</h3>
        <p className="text-xs text-text-muted mb-4 leading-relaxed">
          Insidr does not leave tabs blank — you should always see headers, filters, and a message
          like this when there is no data. Use the table below to understand what it means and what
          to do.
        </p>
        <div className="space-y-3">
          {EMPTY_STATE_GUIDE.map((row) => (
            <article
              key={row.id}
              className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5"
            >
              <p className="text-xs font-bold text-amber-200/90 uppercase tracking-wider mb-1">
                {row.screen}
              </p>
              <p className="text-sm text-text-muted mb-2">
                <strong className="text-text-main">Meaning:</strong> {row.meaning}
              </p>
              <p className="text-sm text-text-muted">
                <strong className="text-text-main">What to do:</strong> {row.whatToDo}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold text-text-main mb-3">Feature reference</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {FEATURE_GUIDE.map((f) => (
            <article key={f.id} className="p-4 rounded-xl border border-border bg-surface/50">
              <p className="font-bold text-text-main text-sm mb-1">{f.title}</p>
              <p className="text-xs text-primary font-medium mb-2">{f.purpose}</p>
              <p className="text-sm text-text-muted leading-relaxed">{f.usage}</p>
              {f.tiers && (
                <p className="text-[10px] text-text-muted mt-2 border-t border-border/50 pt-2">
                  Access: {f.tiers}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border/80 p-4 bg-surface/30">
        <h3 className="text-sm font-bold text-text-main mb-2">Important reminders</h3>
        <ul className="text-xs text-text-muted space-y-1.5 list-disc pl-4">
          {LEGAL_REMINDERS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border p-5 bg-background/20">
        <div className="flex items-center gap-2 mb-4">
          <Server size={18} className="text-primary" />
          <h3 className="text-sm font-bold text-text-main">Data source health</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {statusRows.map(({ key, label, src }) => {
            const entry = src || sources?.[key];
            const meta = statusMeta(entry);
            const Icon = meta.icon;
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-border/80 bg-surface"
              >
                <span className="text-sm font-medium text-text-main">{label}</span>
                <span
                  className={`text-[10px] font-bold uppercase flex items-center gap-1 ${
                    meta.tone === 'ok' ? 'text-emerald-500' : meta.tone === 'warn' ? 'text-amber-500' : 'text-text-muted'
                  }`}
                >
                  <Icon size={12} />
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-text-muted mt-4">
          Keys live in <code className="text-primary">.env</code> — see <code className="text-primary">API_KEYS_GUIDE.md</code>.
          Restart <code className="text-primary">npm run dev:all</code> after changes.
        </p>
      </section>
    </div>
  );
};

export default PlatformGuide;
