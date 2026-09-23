import { request } from '@/lib/api';
import type { Page } from '@/lib/pagination';

/** Fixed enum used only to pick an icon/color per row — the `message` field is
 * already a complete, human-readable sentence and is rendered as-is; never build
 * display text from `type`. */
export type NotificationType =
  | 'FRANCHISE_FINALIZED'
  | 'ROYALTY_STATE_HEAD_REVIEW_NEEDED'
  | 'ROYALTY_ADMIN_REVIEW_NEEDED'
  | 'ROYALTY_RECOMMENDATION_MADE'
  | 'ROYALTY_REQUEST_DECIDED'
  | 'FIRM_OWNER_ADDED'
  | 'FIRM_OWNER_REMOVED'
  | 'FIRM_OWNER_MADE_PRIMARY'
  | 'SALON_TRANSFERRED'
  | 'AGREEMENT_RENEWED'
  | 'AGREEMENT_TERMINATED'
  | 'DOCUMENT_VERIFIED'
  | 'DOCUMENT_REJECTED'
  | 'DOCUMENT_REPLACED'
  | 'DOCUMENT_DELETED'
  | 'SALON_AUDIT_STARTED'
  | 'SALON_AUDIT_SUBMITTED'
  | 'SALON_AUDIT_REVIEWED';

/** Plain string, not an enum from a shared source — match exactly. */
export type NotificationRelatedEntityType =
  | 'ROYALTY_CHANGE_REQUEST'
  | 'FIRM'
  | 'AGREEMENT'
  | 'SALON'
  | 'FRANCHISE_DOCUMENT'
  | 'SALON_AUDIT';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: string;
  readAt?: string;
  relatedEntityType: NotificationRelatedEntityType | null;
  relatedEntityId: string | null;
}

interface RawNotification {
  id: number;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: string;
  readAt?: string | null;
  relatedEntityType: NotificationRelatedEntityType | null;
  relatedEntityId?: number | null;
}

function adaptNotification(n: RawNotification): Notification {
  return {
    id: String(n.id),
    type: n.type,
    message: n.message,
    read: n.read,
    createdAt: n.createdAt,
    readAt: n.readAt ?? undefined,
    relatedEntityType: n.relatedEntityType,
    relatedEntityId: n.relatedEntityId != null ? String(n.relatedEntityId) : null,
  };
}

/** GET /api/v1/notifications — the current user's own notifications, paginated,
 * newest first. Standard Spring Page<T> envelope. */
export async function listNotifications(page = 0, size = 20): Promise<Page<Notification>> {
  const qs = new URLSearchParams();
  qs.set('page', String(page));
  qs.set('size', String(size));
  qs.set('sort', 'createdAt,desc');
  const data = await request<Page<RawNotification>>(`/notifications?${qs.toString()}`);
  return { ...data, content: data.content.map(adaptNotification) };
}

/** GET /api/v1/notifications/unread-count — for the bell icon's badge. Poll this
 * periodically; do not poll the list endpoint continuously. */
export async function getUnreadNotificationCount(): Promise<number> {
  const data = await request<{ unreadCount: number }>('/notifications/unread-count');
  return data.unreadCount;
}

/** POST /api/v1/notifications/{id}/read — marks one notification as read. 404
 * means it no longer exists or doesn't belong to the current user; callers should
 * treat that as "already gone" and just drop it from local state. */
export async function markNotificationRead(id: string): Promise<Notification> {
  const data = await request<RawNotification>(`/notifications/${id}/read`, { method: 'POST' });
  return adaptNotification(data);
}

/** POST /api/v1/notifications/read-all — marks every unread notification for the
 * current user as read. */
export async function markAllNotificationsRead(): Promise<void> {
  await request<{ message: string }>('/notifications/read-all', { method: 'POST' });
}

/** Maps a notification's related entity to an existing detail-page route. Only
 * entity types with a standalone route addressable by that id alone are wired
 * (SALON, FIRM); ROYALTY_CHANGE_REQUEST goes to the approvals list since there's
 * no per-request detail route. AGREEMENT, FRANCHISE_DOCUMENT and SALON_AUDIT have
 * no route reachable from their id alone today, so they resolve to null and the
 * notification is just marked read without navigating. */
export function getNotificationLink(n: Pick<Notification, 'relatedEntityType' | 'relatedEntityId'>): string | null {
  if (!n.relatedEntityType || !n.relatedEntityId) return null;
  switch (n.relatedEntityType) {
    case 'SALON':
      return `/salon/${n.relatedEntityId}`;
    case 'FIRM':
      return `/firm/${n.relatedEntityId}`;
    case 'ROYALTY_CHANGE_REQUEST':
      return '/royalty-approvals';
    default:
      return null;
  }
}
