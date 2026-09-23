import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  formatRoyaltyType,
  formatRoyaltyValue,
  royaltyStatusBucket,
  royaltyStatusLabel,
} from '@/lib/royaltyApi';
import type { RoyaltyRequest } from '@/types';

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function OverrideBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700"
      title="An Admin decided this request before the State Head recommended."
    >
      <ShieldAlert className="h-3 w-3" />
      Admin overrode State Head
    </span>
  );
}

interface RoyaltyRequestItemProps {
  request: RoyaltyRequest;
  /** Resolves a user id (as on the wire) to a display name. */
  userName: (userId?: string) => string;
  /** Shown as a heading above the value change, e.g. on the cross-salon queue. */
  title?: string;
  /** Action area rendered at the bottom (forms/buttons). */
  children?: ReactNode;
}

/** State Head step, rendered from stateHeadStatus — never the raw recommendation. */
function StateHeadStep({ r, userName }: { r: RoyaltyRequest; userName: (id?: string) => string }) {
  switch (r.stateHeadStatus) {
    case 'SKIPPED':
      return <p>State Head step skipped — the submitter was the assigned State Head.</p>;
    case 'PENDING':
      return <p>{r.overallStatus === 'PENDING_STATE_HEAD' ? 'Awaiting State Head recommendation.' : 'No State Head recommendation was given.'}</p>;
    case 'APPROVED':
    case 'REJECTED':
      return (
        <p>
          State Head recommended {r.stateHeadStatus === 'APPROVED' ? 'approval' : 'rejection'}
          {r.stateHeadDecidedAt && ` on ${formatDate(r.stateHeadDecidedAt)}`}
          {r.stateHeadDecidedBy && ` by ${userName(r.stateHeadDecidedBy)}`}
          {r.stateHeadReason && ` — ${r.stateHeadReason}`}
        </p>
      );
  }
}

export function RoyaltyRequestItem({ request: r, userName, title, children }: RoyaltyRequestItemProps) {
  const typeChanged = r.currentRoyaltyType !== r.newRoyaltyType;
  return (
    <div className="py-4 space-y-3" data-royalty-request={r.id}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          {title && <p className="text-sm font-semibold text-ink">{title}</p>}
          <p className="text-sm text-ink font-medium">
            {formatRoyaltyValue(r.currentValue, r.currentRoyaltyType)} → {formatRoyaltyValue(r.newValue, r.newRoyaltyType)}
            <span className="ml-2 text-xs font-normal text-ink-secondary">
              {typeChanged
                ? `${formatRoyaltyType(r.currentRoyaltyType)} → ${formatRoyaltyType(r.newRoyaltyType)}`
                : formatRoyaltyType(r.newRoyaltyType)}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {r.adminOverrodeStateHead && <OverrideBadge />}
          <StatusBadge bucket={royaltyStatusBucket(r.overallStatus)} label={royaltyStatusLabel(r.overallStatus)} />
        </div>
      </div>

      <p className="text-sm text-ink">
        <span className="text-ink-secondary">Reason:</span> {r.reason || '—'}
        {r.instructedBy && <span className="text-ink-secondary"> · Instructed by: {r.instructedBy}</span>}
      </p>

      <div className="text-xs text-ink-secondary space-y-1">
        <p>
          Submitted by {userName(r.requestedBy)} on {formatDate(r.createdAt)}
        </p>
        <StateHeadStep r={r} userName={userName} />
        {r.adminDecision && (
          <p>
            Admin {r.adminDecision === 'APPROVED' ? 'approved' : 'rejected'}
            {r.adminDecidedAt && ` on ${formatDate(r.adminDecidedAt)}`}
            {r.adminDecidedBy && ` by ${userName(r.adminDecidedBy)}`}
            {r.adminReason && ` — ${r.adminReason}`}
          </p>
        )}
        {r.overallStatus === 'PENDING_ADMIN' && <p>Awaiting Admin decision.</p>}
      </div>

      {children}
    </div>
  );
}
