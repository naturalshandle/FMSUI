import type { Agreement } from '@/types';

/** Reminder window used by the backend's daily expiry job (30/14/7/1 days). */
export const EXPIRY_WINDOW_DAYS = 30;

const MS_PER_DAY = 86_400_000;

/** Parses a `yyyy-MM-dd` string as a LOCAL calendar date. Never use
 * `new Date("2026-10-09")` for these — that parses as UTC midnight and shifts the
 * day in negative-offset timezones. Returns null if the string isn't a real date. */
export function parseLocalDate(value?: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

export function formatLocalDate(value?: string | null): string {
  const d = parseLocalDate(value);
  if (!d) return value || '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Whole calendar days from today (local) until `validTill`; negative once past.
 * Null if `validTill` doesn't parse. */
export function daysUntil(validTill?: string | null): number | null {
  const till = parseLocalDate(validTill);
  if (!till) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Round, not floor — absorbs the 1h drift across DST boundaries.
  return Math.round((till.getTime() - today.getTime()) / MS_PER_DAY);
}

export type ExpiryTone = 'red' | 'amber';

export interface ExpiryInfo {
  expired: boolean;
  daysLeft: number | null;
  tone: ExpiryTone;
  /** Short chip text, e.g. "Expires in 12 days". */
  label: string;
}

/** Expiry state for an agreement, or null when nothing should be shown (non-ACTIVE,
 * more than 30 days out, or an unparseable validTill). The expired state always
 * comes from the server's `isExpired`, never from the client clock. */
export function getExpiryInfo(a: Pick<Agreement, 'status' | 'isExpired' | 'validTill'>): ExpiryInfo | null {
  if (a.status !== 'ACTIVE') return null;
  if (a.isExpired) return { expired: true, daysLeft: daysUntil(a.validTill), tone: 'red', label: 'Expired' };

  const days = daysUntil(a.validTill);
  if (days === null || days > EXPIRY_WINDOW_DAYS) return null;
  // Server says not expired yet; a negative value here is only clock/timezone skew.
  const daysLeft = Math.max(0, days);
  const label = daysLeft === 0 ? 'Expires today' : daysLeft === 1 ? 'Expires tomorrow' : `Expires in ${daysLeft} days`;
  return { expired: false, daysLeft, tone: daysLeft <= 7 ? 'red' : 'amber', label };
}
