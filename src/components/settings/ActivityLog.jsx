import React, { useEffect, useState } from 'react';
import { Bell, MonitorCog, RefreshCw } from 'lucide-react';
import { api } from '../../services/api/api.js';
import { systemStorage } from '../../services/tradingSystem/storage';

const toneClass = {
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
  success: 'text-emerald-400',
};

/**
 * Activity log — sync events, API messages, and in-app notifications for your account.
 * Not a separate “admin console”; this is your personal operational feed.
 */
const ActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [source, setSource] = useState('loading');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [logsRes, notesRes] = await Promise.all([
        api.monitoring.getLogs(),
        api.monitoring.getNotifications(),
      ]);

      if (logsRes?.success) {
        setLogs(
          (logsRes.data || []).map((row) => ({
            id: row.id,
            level: row.level,
            message: row.message,
            createdAt: row.created_at,
          })),
        );
      }

      if (notesRes?.success) {
        setNotifications(
          (notesRes.data || []).map((row) => ({
            id: row.id,
            kind: row.type,
            title: row.title,
            details: row.body,
            createdAt: row.created_at,
          })),
        );
      }

      setSource('postgres');
    } catch {
      setLogs(systemStorage.getLogs());
      setNotifications(systemStorage.getNotifications());
      setSource('local');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted leading-relaxed">
        Your account activity feed: API sync results, alerts, and system messages. Use this to
        confirm news sync, calendar updates, and trade actions completed successfully.
      </p>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-text-muted">
          Source:{' '}
          <span className="font-bold text-primary">
            {source === 'postgres' ? 'Database' : source === 'local' ? 'Local session' : '…'}
          </span>
        </p>
        <button type="button" onClick={load} className="btn-ghost text-sm px-3 py-1.5 inline-flex gap-2">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="dash-panel">
          <div className="dash-panel__head">
            <h4 className="dash-panel__title">
              <MonitorCog size={16} className="text-primary" />
              System log
            </h4>
          </div>
          <div className="dash-panel__body max-h-[360px] overflow-y-auto custom-scrollbar space-y-2">
            {logs.length ? (
              logs.slice(0, 80).map((log) => (
                <div key={log.id} className="border-b border-border/50 pb-2 text-sm last:border-0">
                  <p className={`${toneClass[log.level] || 'text-text-main'} font-semibold`}>
                    {String(log.level).toUpperCase()} — {log.message}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-text-muted">No log entries yet. Actions will appear here as you use the platform.</p>
            )}
          </div>
        </div>

        <div className="dash-panel">
          <div className="dash-panel__head">
            <h4 className="dash-panel__title">
              <Bell size={16} className="text-primary" />
              Notifications
            </h4>
          </div>
          <div className="dash-panel__body max-h-[360px] overflow-y-auto custom-scrollbar space-y-2">
            {notifications.length ? (
              notifications.slice(0, 80).map((item) => (
                <div key={item.id} className="border-b border-border/50 pb-2 text-sm last:border-0">
                  <p className={`${toneClass[item.kind] || 'text-text-main'} font-semibold`}>
                    {item.title}
                  </p>
                  {item.details && <p className="text-xs text-text-muted mt-0.5">{item.details}</p>}
                  <p className="text-xs text-text-muted mt-0.5">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-text-muted">No notifications yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityLog;
