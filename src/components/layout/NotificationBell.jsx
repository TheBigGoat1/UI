import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { api } from '../../services/api/api.js';
import { isBrowserPushEnabled, showBrowserNotification } from '../../utils/browserNotify.js';

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef(null);
  const seenIdsRef = useRef(null);

  const unread = items.filter((n) => !n.is_read).length;

  const notifyNewItems = (nextItems) => {
    if (!isBrowserPushEnabled()) return;
    const seen = seenIdsRef.current;
    if (!seen) {
      seenIdsRef.current = new Set(nextItems.map((n) => n.id));
      return;
    }
    const fresh = nextItems.filter((n) => !n.is_read && !seen.has(n.id));
    fresh.slice(0, 3).forEach((item) => {
      showBrowserNotification(item.title, item.body, { tag: `insidr-${item.id}` });
    });
    seenIdsRef.current = new Set(nextItems.map((n) => n.id));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.system.getNotifications();
      if (res?.success && Array.isArray(res.data)) {
        notifyNewItems(res.data);
        setItems(res.data);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 45000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const onDocClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const markAllRead = async () => {
    try {
      await api.system.markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      /* ignore */
    }
  };

  const markRead = async (id) => {
    try {
      await api.system.markNotificationRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        className="relative p-2 rounded-lg border border-border text-text-muted hover:text-text-main hover:bg-surface-hover transition-colors"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] dash-panel shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-background/50">
            <span className="text-xs font-bold text-text-main">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[10px] font-bold text-primary hover:underline inline-flex items-center gap-1"
              >
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto custom-scrollbar">
            {loading && !items.length ? (
              <p className="p-4 text-xs text-text-muted flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Loading…
              </p>
            ) : items.length ? (
              items.slice(0, 30).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => !item.is_read && markRead(item.id)}
                  className={`w-full text-left px-3 py-2.5 border-b border-border/40 hover:bg-background/40 transition-colors ${
                    item.is_read ? 'opacity-70' : ''
                  }`}
                >
                  <p className="text-xs font-bold text-text-main">{item.title}</p>
                  {item.body && (
                    <p className="text-[10px] text-text-muted mt-0.5 line-clamp-2">{item.body}</p>
                  )}
                  <p className="text-[9px] text-text-muted mt-1 font-mono">
                    {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                  </p>
                </button>
              ))
            ) : (
              <p className="p-4 text-xs text-text-muted">No notifications yet.</p>
            )}
          </div>
          <div className="px-3 py-2 border-t border-border bg-background/30">
            <Link
              to="/dashboard/settings?tab=activity"
              className="text-[10px] font-bold text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              View activity log →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
