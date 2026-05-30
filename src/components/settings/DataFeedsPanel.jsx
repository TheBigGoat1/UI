import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api/api.js';
import {
  CheckCircle2,
  AlertCircle,
  CircleDashed,
  Radio,
  Info,
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

const DataFeedsPanel = () => {
  const [sources, setSources] = useState(null);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    api.system.getDataSources().then((r) => r?.success && setSources(r.data)).catch(() => {});
    api.system.getHealth().then((r) => r?.success && setHealth(r.data)).catch(() => {});
  }, []);

  const rows = [
    { key: 'database', label: 'Database', src: { status: health ? 'ok' : 'error' } },
    { key: 'redis', label: 'Redis cache' },
    { key: 'binance', label: 'Binance (crypto — live)' },
    { key: 'twelveData', label: 'Twelve Data (forex)' },
    { key: 'newsApi', label: 'NewsAPI.org' },
    { key: 'newsData', label: 'NewsData.io' },
    { key: 'coindesk', label: 'CoinDesk RSS' },
    { key: 'cryptopanic', label: 'CryptoPanic' },
    { key: 'anthropic', label: 'Anthropic AI' },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
        <h3 className="text-sm font-bold text-amber-200/90 flex items-center gap-2 mb-2">
          <Info size={16} />
          Live vs Model data
        </h3>
        <p className="text-sm text-text-muted leading-relaxed">
          <strong className="text-text-main">Live</strong> badges mean real exchange or API quotes.
          <strong className="text-text-main"> Model</strong> means rate-limited or offline feeds — analysis
          still runs on structural OHLC, not live prices. For demos, use{' '}
          <strong className="text-text-main">BTCUSD</strong> or <strong className="text-text-main">ETHUSD</strong>{' '}
          (Binance, no key).
        </p>
      </section>

      <section>
        <h3 className="text-sm font-bold text-text-main mb-3 flex items-center gap-2">
          <Radio size={16} className="text-primary" />
          Feed status
        </h3>
        <ul className="space-y-2">
          {rows.map(({ key, label, src: override }) => {
            const entry = override || sources?.[key];
            const meta = statusMeta(entry);
            const Icon = meta.icon;
            return (
              <li
                key={key}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
              >
                <span className="text-sm text-text-main">{label}</span>
                <span
                  className={`text-[10px] font-bold uppercase flex items-center gap-1 ${
                    meta.tone === 'ok'
                      ? 'text-emerald-500'
                      : meta.tone === 'warn'
                        ? 'text-amber-400'
                        : 'text-text-muted'
                  }`}
                >
                  <Icon size={12} />
                  {meta.label}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-text-muted mt-3">
          Keys live in <code className="text-primary">.env</code> — see{' '}
          <Link to="/dashboard/settings?tab=guide" className="text-primary font-bold hover:underline">
            Platform guide
          </Link>{' '}
          or API_KEYS_GUIDE.md in the project folder.
        </p>
      </section>
    </div>
  );
};

export default DataFeedsPanel;
