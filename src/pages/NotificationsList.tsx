import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { NotificationRow } from '@/components/domain/NotificationRow';
import { usePagedList } from '@/lib/pagination';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationLink,
  type Notification,
} from '@/lib/notificationsApi';

export function NotificationsList() {
  const navigate = useNavigate();
  const {
    content: items,
    page,
    setPage,
    totalElements,
    totalPages,
    loading,
    error,
    reload,
  } = usePagedList<Notification>((p, size) => listNotifications(p, size), [], 20);

  const handleRowClick = async (n: Notification) => {
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
      } catch (err) {
        // A 404 ("already gone") or any other failure is resolved by reloading
        // from the server below rather than special-cased here.
        void err;
      }
      reload();
    }
    const link = getNotificationLink(n);
    if (link) navigate(link);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
    } finally {
      reload();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Notifications</h1>
          <p className="text-sm text-ink-secondary mt-1">Everything relevant to your role, newest first</p>
        </div>
        <button
          type="button"
          onClick={handleMarkAllRead}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-brand-700 border border-brand-200 hover:bg-brand-50 hover:border-brand-300 transition-colors"
        >
          <CheckCheck className="h-4 w-4" />
          Mark all as read
        </button>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-ink-secondary">Loading...</p>
        ) : error ? (
          <EmptyState title="Couldn't load notifications" message={error} icon={<Bell className="h-8 w-8" />} />
        ) : items.length === 0 ? (
          <EmptyState title="No notifications yet" message="" icon={<Bell className="h-8 w-8" />} />
        ) : (
          <div className="divide-y divide-brand-50">
            {items.map((n) => (
              <NotificationRow key={n.id} notification={n} onClick={handleRowClick} />
            ))}
          </div>
        )}
      </Card>

      {items.length > 0 && (
        <Pagination page={page} totalPages={totalPages} totalElements={totalElements} onPageChange={setPage} itemLabel="notification" />
      )}
    </div>
  );
}
