import { useCallback, useEffect, useState } from 'react';
import { Percent, Check, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useApp } from '@/context/AppContext';
import { ApiError } from '@/lib/api';
import { getSalon } from '@/lib/salonsApi';
import { getFirm } from '@/lib/firmsApi';
import { listOfficials } from '@/lib/officialsApi';
import { decideRoyaltyRequest, listPendingRoyaltyApprovals, royaltyStatusBadgeKind, type RoyaltyDeciderRole } from '@/lib/royaltyApi';
import type { FirmOwner, Official, RoyaltyRequest } from '@/types';

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * The pending-approvals list is already scoped server-side to the caller's outstanding
 * decisions, so it's safe to pick a single decision endpoint per caller: State-Head-only
 * users get the state-head-decision endpoint, admin roles get admin-decision.
 */
function deciderRoleFor(roles: string[] | undefined): RoyaltyDeciderRole {
  const isAdmin = roles?.some((r) => r === 'SUPER_ADMIN' || r === 'CORPORATE_ADMIN');
  return isAdmin ? 'ADMIN' : 'STATE_HEAD';
}

/** Confirmed: re-deciding an already-decided tier, or a request no longer PENDING overall, is a 409. */
function isAlreadyClosedError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409;
}

export function RoyaltyApprovals() {
  const { showToast } = useToast();
  const { currentUser } = useApp();
  const deciderRole = deciderRoleFor(currentUser?.roles);

  const [requests, setRequests] = useState<RoyaltyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<RoyaltyRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Response is IDs-only (no salonName/franchiseeName/requestedByName) — resolved
  // client-side below since the pending queue is one page at a time (small N).
  const [salonNames, setSalonNames] = useState<Record<string, string>>({});
  const [franchiseeNames, setFranchiseeNames] = useState<Record<string, string>>({});
  const [officials, setOfficials] = useState<Official[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    listPendingRoyaltyApprovals()
      .then(setRequests)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Failed to load pending royalty requests.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    listOfficials({ size: 500 })
      .then((page) => setOfficials(page.content))
      .catch(() => setOfficials([]));
  }, []);

  useEffect(() => {
    const uniqueSalonIds = Array.from(new Set(requests.map((r) => r.salonId))).filter(
      (sid) => !(sid in salonNames),
    );
    if (uniqueSalonIds.length === 0) return;

    uniqueSalonIds.forEach((salonId) => {
      getSalon(salonId)
        .then((salon) => {
          setSalonNames((prev) => ({ ...prev, [salonId]: salon.salonName }));
          if (!salon.firmId) return;
          return getFirm(salon.firmId).then((firm) => {
            const map: Record<string, string> = {};
            firm.owners.forEach((o: FirmOwner) => {
              map[o.franchiseeId] = o.franchiseeName ?? `Franchisee #${o.franchiseeId}`;
            });
            setFranchiseeNames((prev) => ({ ...prev, ...map }));
          });
        })
        .catch(() => setSalonNames((prev) => ({ ...prev, [salonId]: `Salon #${salonId}` })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests]);

  const salonLabel = (r: RoyaltyRequest) => salonNames[r.salonId] ?? `Salon #${r.salonId}`;
  const franchiseeLabel = (r: RoyaltyRequest) => franchiseeNames[r.franchiseeId] ?? `Franchisee #${r.franchiseeId}`;
  const userName = (userId?: string) => {
    if (!userId) return '—';
    const o = officials.find((of) => of.userId === userId);
    return o ? o.name : `User #${userId}`;
  };

  const handleApprove = async (r: RoyaltyRequest) => {
    setBusyId(r.id);
    try {
      await decideRoyaltyRequest(r.id, deciderRole, true);
      showToast('success', `Royalty change for ${salonLabel(r)} approved.`);
      load();
    } catch (err) {
      if (isAlreadyClosedError(err)) {
        showToast('error', 'This request was already resolved by the other approver.');
        load();
      } else {
        showToast('error', err instanceof ApiError ? err.message : 'Failed to approve request.');
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setBusyId(rejectModal.id);
    try {
      await decideRoyaltyRequest(rejectModal.id, deciderRole, false, rejectReason);
      showToast('info', `Royalty change for ${salonLabel(rejectModal)} rejected.`);
      setRejectModal(null);
      setRejectReason('');
      load();
    } catch (err) {
      if (isAlreadyClosedError(err)) {
        showToast('error', 'This request was already resolved by the other approver.');
        setRejectModal(null);
        setRejectReason('');
        load();
      } else {
        showToast('error', err instanceof ApiError ? err.message : 'Failed to reject request.');
      }
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <Card className="p-6 space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Royalty Approvals</h1>
        <p className="text-sm text-ink-secondary mt-1">Royalty change requests awaiting your decision.</p>
      </div>

      <Card className="p-6">
        {loadError ? (
          <EmptyState title="Couldn't load pending requests" message={loadError} action={<Button onClick={load}>Retry</Button>} />
        ) : requests.length === 0 ? (
          <EmptyState
            title="No pending royalty approvals"
            message="Requests awaiting your decision will appear here."
            icon={<Percent className="h-8 w-8" />}
          />
        ) : (
          <div className="divide-y divide-brand-50">
            {requests.map((r) => (
              <div key={r.id} className="py-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{salonLabel(r)}</p>
                    <p className="text-xs text-ink-secondary">Franchisee: {franchiseeLabel(r)}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-ink font-medium">
                      {r.currentPercentage != null ? `${r.currentPercentage}%` : 'Not set'} → {r.newPercentage}%
                    </span>
                    <Badge kind={royaltyStatusBadgeKind(r.overallStatus)} label={r.overallStatus} />
                  </div>
                </div>

                <div className="text-xs text-ink-secondary flex flex-wrap gap-x-2">
                  <span>
                    State Head: <Badge kind={royaltyStatusBadgeKind(r.stateHeadDecision)} label={r.stateHeadDecision} size="sm" />
                  </span>
                  <span>
                    Admin: <Badge kind={royaltyStatusBadgeKind(r.adminDecision)} label={r.adminDecision} size="sm" />
                  </span>
                </div>

                <p className="text-sm text-ink">
                  <span className="text-ink-secondary">Reason:</span> {r.reason || '—'}
                  {r.instructedBy && <span className="text-ink-secondary"> · Instructed by: {r.instructedBy}</span>}
                </p>
                <p className="text-xs text-ink-secondary">
                  Requested by {userName(r.requestedBy)} on {formatDate(r.createdAt)}
                </p>

                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApprove(r)} disabled={busyId === r.id}>
                    <Check className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setRejectModal(r)} disabled={busyId === r.id}>
                    <X className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Reject reason modal */}
      <Modal
        open={!!rejectModal}
        onClose={() => {
          setRejectModal(null);
          setRejectReason('');
        }}
        title="Reject Royalty Change"
        description={rejectModal ? `Reject the royalty change request for ${salonLabel(rejectModal)}.` : ''}
        primaryLabel={busyId === rejectModal?.id ? 'Rejecting...' : 'Reject Request'}
        primaryVariant="danger"
        primaryDisabled={!rejectReason.trim() || busyId === rejectModal?.id}
        onPrimary={handleReject}
      >
        <Textarea
          label="Reason"
          placeholder="Why is this request being rejected?"
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          error={!rejectReason.trim() ? 'A reason is required.' : undefined}
        />
      </Modal>
    </div>
  );
}
