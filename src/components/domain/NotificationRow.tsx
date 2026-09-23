import {
  Bell,
  Percent,
  Building2,
  Scissors,
  FileText,
  Camera,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import type { Notification, NotificationType } from '@/lib/notificationsApi';

const iconByType: Record<NotificationType, LucideIcon> = {
  FRANCHISE_FINALIZED: CheckCircle2,
  ROYALTY_STATE_HEAD_REVIEW_NEEDED: Percent,
  ROYALTY_ADMIN_REVIEW_NEEDED: Percent,
  ROYALTY_RECOMMENDATION_MADE: Percent,
  ROYALTY_REQUEST_DECIDED: Percent,
  FIRM_OWNER_ADDED: Building2,
  FIRM_OWNER_REMOVED: Building2,
  FIRM_OWNER_MADE_PRIMARY: Building2,
  SALON_TRANSFERRED: Scissors,
  AGREEMENT_RENEWED: FileText,
  AGREEMENT_TERMINATED: FileText,
  DOCUMENT_VERIFIED: FileText,
  DOCUMENT_REJECTED: FileText,
  DOCUMENT_REPLACED: FileText,
  DOCUMENT_DELETED: FileText,
  SALON_AUDIT_STARTED: Camera,
  SALON_AUDIT_SUBMITTED: Camera,
  SALON_AUDIT_REVIEWED: Camera,
};

/** Small, dependency-free "time ago" formatter — matches the granularity used in
 * the suggested UX ("2h ago") without pulling in a date library for one string. */
function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface Props {
  notification: Notification;
  onClick: (n: Notification) => void;
}

export function NotificationRow({ notification, onClick }: Props) {
  const Icon = iconByType[notification.type] ?? Bell;
  return (
    <button
      type="button"
      onClick={() => onClick(notification)}
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-brand-50/50 ${
        !notification.read ? 'bg-brand-50/30' : ''
      }`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${!notification.read ? 'font-semibold text-ink' : 'text-ink-secondary'}`}>
          {notification.message}
        </p>
        <p className="text-xs text-ink-secondary/70 mt-0.5">{formatRelativeTime(notification.createdAt)}</p>
      </div>
      {!notification.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
    </button>
  );
}
