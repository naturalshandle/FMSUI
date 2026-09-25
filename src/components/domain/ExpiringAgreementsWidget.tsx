import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { AgreementExpiryChip } from '@/components/domain/AgreementExpiryChip';
import { searchAgreements } from '@/lib/agreementsApi';
import { getSalon } from '@/lib/salonsApi';
import { EXPIRY_WINDOW_DAYS, daysUntil, formatLocalDate } from '@/lib/agreementExpiry';
import { ApiError } from '@/lib/api';
import type { Agreement } from '@/types';

const FETCH_SIZE = 50;

/** Admin dashboard card listing ACTIVE agreements that are already expired or end
 * within the 30-day reminder window. There's no dedicated "expiring" endpoint:
 * this pulls ACTIVE agreements sorted by validTill ascending and filters here. */
export function ExpiringAgreementsWidget({ expiredCount }: { expiredCount: number }) {
  const [expired, setExpired] = useState<Agreement[]>([]);
  const [expiring, setExpiring] = useState<Agreement[]>([]);
  // True when the fetched page ran out before reaching agreements past the window.
  const [truncated, setTruncated] = useState(false);
  const [salonNames, setSalonNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    searchAgreements({ status: 'ACTIVE', sort: 'validTill,asc', size: FETCH_SIZE })
      .then((page) => {
        if (cancelled) return;
        const expiredRows: Agreement[] = [];
        const expiringRows: Agreement[] = [];
        let reachedWindowEnd = false;
        for (const a of page.content) {
          if (a.isExpired) {
            expiredRows.push(a);
            continue;
          }
          const days = daysUntil(a.validTill);
          if (days === null) continue;
          // Sorted soonest-first, so everything after this is further out too.
          if (days > EXPIRY_WINDOW_DAYS) {
            reachedWindowEnd = true;
            break;
          }
          expiringRows.push(a);
        }
        setExpired(expiredRows);
        setExpiring(expiringRows);
        setTruncated(!reachedWindowEnd && !page.last);

        const salonIds = [...new Set([...expiredRows, ...expiringRows].map((a) => a.salonId))];
        salonIds.forEach((salonId) => {
          getSalon(salonId)
            .then((s) => !cancelled && setSalonNames((prev) => ({ ...prev, [salonId]: s.name })))
            .catch(() => {
              // Falls back to "Salon #id".
            });
        });
      })
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Failed to load agreements.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const renderRow = (a: Agreement) => (
    <Link
      key={a.id}
      to={`/agreements/${a.id}`}
      className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-brand-50/50 transition-colors"
    >
      <div className="min-w-0">
        <p className="font-medium text-ink truncate">{salonNames[a.salonId] ?? `Salon #${a.salonId}`}</p>
        <p className="text-xs text-ink-secondary">Valid till {formatLocalDate(a.validTill)}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <AgreementExpiryChip agreement={a} />
        <ChevronRight className="h-4 w-4 text-ink-secondary" />
      </div>
    </Link>
  );

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock className="h-4 w-4 text-brand-600" />
        <h2 className="text-sm font-semibold text-ink">Expiring &amp; Expired Agreements</h2>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : error ? (
        <p className="text-sm text-ink-secondary">{error}</p>
      ) : (
        <div className="space-y-5">
          {expired.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700 mb-2">Expired ({expiredCount})</p>
              <div className="rounded-xl border border-red-100 divide-y divide-red-50 overflow-hidden">{expired.map(renderRow)}</div>
              {expiredCount > expired.length && (
                <p className="text-xs text-ink-secondary mt-2">Showing the {expired.length} oldest.</p>
              )}
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">
              Expiring within {EXPIRY_WINDOW_DAYS} days ({expiring.length})
            </p>
            {truncated ? (
              <p className="text-xs text-ink-secondary mb-2">
                Only the first {FETCH_SIZE} active agreements by end date are checked, so this list may be incomplete.
              </p>
            ) : null}
            {expiring.length === 0 ? (
              truncated ? null : (
                <p className="text-sm text-ink-secondary">No agreements expiring in the next {EXPIRY_WINDOW_DAYS} days.</p>
              )
            ) : (
              <div className="rounded-xl border border-amber-100 divide-y divide-amber-50 overflow-hidden">{expiring.map(renderRow)}</div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
