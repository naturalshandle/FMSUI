import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { NotificationRow } from '@/components/domain/NotificationRow';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError } from '@/lib/api';
import {
  listNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationLink,
  type Notification,
} from '@/lib/notificationsApi';

// Poll the lightweight unread-count endpoint on an interval so the badge stays
// roughly live (plus on window focus); the list endpoint is only ever fetched
// while the panel is open.
const POLL_INTERVAL_MS = 60_000;
const PANEL_PAGE_SIZE = 10;

export function NotificationBell() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const refresh = () => {
      getUnreadNotificationCount()
        .then(setUnreadCount)
        .catch(() => {});
    };
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const loadPanel = () => {
    setLoading(true);
    setError(null);
    listNotifications(0, PANEL_PAGE_SIZE)
      .then((result) => {
        setItems(result.content);
        setPage(0);
        setHasMore(!result.last);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load notifications.'))
      .finally(() => setLoading(false));
  };

  const loadMore = () => {
    const next = page + 1;
    setLoadingMore(true);
    listNotifications(next, PANEL_PAGE_SIZE)
      .then((result) => {
        // New notifications may have arrived since page 0, shifting the page
        // boundaries, so drop any id we already show.
        setItems((prev) => {
          const seen = new Set(prev.map((it) => it.id));
          return [...prev, ...result.content.filter((it) => !seen.has(it.id))];
        });
        setPage(next);
        setHasMore(!result.last);
      })
      .catch(() => {
        // Leave the button in place so the user can retry.
      })
      .finally(() => setLoadingMore(false));
  };

  const handleToggle = () => {
    setOpen((wasOpen) => {
      const next = !wasOpen;
      if (next) loadPanel();
      return next;
    });
  };

  const handleRowClick = async (n: Notification) => {
    if (!n.read) {
      setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, read: true } : it)));
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await markNotificationRead(n.id);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setItems((prev) => prev.filter((it) => it.id !== n.id));
        }
      }
    }
    const link = getNotificationLink(n);
    setOpen(false);
    if (link) navigate(link);
  };

  const handleMarkAllRead = async () => {
    setItems((prev) => prev.map((it) => ({ ...it, read: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      // Best-effort — a stale badge/list self-corrects on the next poll/open.
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary hover:bg-brand-50 hover:text-brand-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-status-rejected px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[90vw] rounded-xl border border-brand-100 bg-white shadow-lg overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-brand-50">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800 transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-brand-50">
            {loading ? (
              <div className="space-y-3 px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-full" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <p className="px-4 py-6 text-sm text-ink-secondary text-center">{error}</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-secondary text-center">You're all caught up.</p>
            ) : (
              <>
                {items.map((n) => (
                  <NotificationRow key={n.id} notification={n} onClick={handleRowClick} />
                ))}
                {hasMore && (
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="block w-full px-4 py-2.5 text-center text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50 transition-colors"
                  >
                    {loadingMore ? 'Loading...' : 'Load more'}
                  </button>
                )}
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/notifications');
            }}
            className="block w-full px-4 py-2.5 text-center text-xs font-medium text-brand-700 hover:bg-brand-50 border-t border-brand-50 transition-colors"
          >
            See all
          </button>
        </div>
      )}
    </div>
  );
}
