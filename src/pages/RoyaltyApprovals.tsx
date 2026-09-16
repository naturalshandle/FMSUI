import { useCallback, useEffect, useState } from 'react';
import { Percent, Check, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useApp } from '@/context/AppContext';
import { isAdmin } from '@/lib/roles';
import { ApiError } from '@/lib/api';
import { getSalon } from '@/lib/salonsApi';
import { listOfficials } from '@/lib/officialsApi';
import {
  submitStateHeadRecommendation,
  submitAdminDecision,
  listPendingRoyaltyRequests,
  royaltyStatusBucket,
  royaltyStatusLabel,
} from '@/lib/royaltyApi';
import type { Official, RoyaltyRequest } from '@/types';

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isAlreadyClosedError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409;
}

export function RoyaltyApprovals() {
  const { showToast } = useToast();
  const { currentUser } = useApp();
  const admin = isAdmin(currentUser?.roles);

  const [requests, setRequests] = useState<RoyaltyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Reason is required for BOTH approve and reject per spec §8 — one modal covers both.
  const [decisionModal, setDecisionModal] = useState<{ request: RoyaltyRequest; approved: boolean } | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Response is IDs-only (no salonName) — resolved client-side since the pending
  // queue is one page at a time (small N).
  const [salonNames, setSalonNames] = useState<Record<string, string>>({});
  const [officials, setOfficials] = useState<Official[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    listPendingRoyaltyRequests()
      .then(setRequests)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Failed to load pending royalty requests.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    listOfficials({ size: 200 })
      .then((page) => setOfficials(page.content))
      .catch(() => setOfficials([]));
  }, []);

  useEffect(() => {
    const uniqueSalonIds = Array.from(new Set(requests.map((r) => r.salonId))).filter((sid) => !(sid in salonNames));
    if (uniqueSalonIds.length === 0) return;
    uniqueSalonIds.forEach((salonId) => {
      getSalon(salonId)
        .then((salon) => setSalonNames((prev) => ({ ...prev, [salonId]: salon.name })))
        .catch(() => setSalonNames((prev) => ({ ...prev, [salonId]: `Salon #${salonId}` })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests]);

  const salonLabel = (r: RoyaltyRequest) => salonNames[r.salonId] ?? `Salon #${r.salonId}`;
  const userName = (userId?: string) => {
    if (!userId) return '—';
    const o = officials.find((of) => of.userId === userId);
    return o ? o.name : `User #${userId}`;
  };

  const decide = (id: string, approved: boolean, reason: string) =>
    admin ? submitAdminDecision(id, approved, reason) : submitStateHeadRecommendation(id, approved, reason);

  const handleDecision = async () => {
    if (!decisionModal || !decisionReason.trim()) return;
    const { request: r, approved } = decisionModal;
    setBusyId(r.id);
    try {
      await decide(r.id, approved, decisionReason);
      showToast(
        'success',
        admin
          ? `Royalty change for ${salonLabel(r)} ${approved ? 'approved' : 'rejected'}.`
          : `${approved ? 'Approval' : 'Rejection'} recommendation submitted for ${salonLabel(r)}.`,
      );
      setDecisionModal(null);
      setDecisionReason('');
      load();
    } catch (err) {
      if (isAlreadyClosedError(err)) {
        showToast('error', 'This request is no longer awaiting your decision.');
        setDecisionModal(null);
        setDecisionReason('');
        load();
      } else {
        showToast('error', err instanceof ApiError ? err.message : 'Failed to submit decision.');
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
        <h1 className="text-xl font-bold text-ink">{admin ? 'Pending Your Decision' : 'Pending Your Recommendation'}</h1>
        <p className="text-sm text-ink-secondary mt-1">Royalty change requests awaiting your input.</p>
      </div>

      <Card className="p-6">
        {loadError ? (
          <EmptyState title="Couldn't load pending requests" message={loadError} action={<Button onClick={load}>Retry</Button>} />
        ) : requests.length === 0 ? (
          <EmptyState title="Nothing pending your review right now" message="" icon={<Percent className="h-8 w-8" />} />
        ) : (
          <div className="divide-y divide-brand-50">
            {requests.map((r) => (
              <div key={r.id} className="py-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{salonLabel(r)}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-ink font-medium">
                      {r.currentPercentage != null ? `${r.currentPercentage}%` : 'Not set'} → {r.newPercentage}%
                    </span>
                    <StatusBadge bucket={royaltyStatusBucket(r.overallStatus)} label={royaltyStatusLabel(r.overallStatus)} />
                  </div>
                </div>

                {admin && r.stateHeadDecidedAt && (
                  <p className="text-xs text-ink-secondary">
                    State Head approved on {formatDate(r.stateHeadDecidedAt)} by {userName(r.stateHeadDecidedBy)}
                    {r.stateHeadReason && ` — ${r.stateHeadReason}`}
                  </p>
                )}

                <p className="text-sm text-ink">
                  <span className="text-ink-secondary">Reason:</span> {r.reason || '—'}
                  {r.instructedBy && <span className="text-ink-secondary"> · Instructed by: {r.instructedBy}</span>}
                </p>
                <p className="text-xs text-ink-secondary">
                  Requested by {userName(r.requestedBy)} on {formatDate(r.createdAt)}
                </p>
                {!admin && (
                  <p className="text-xs text-ink-secondary italic">
                    Your recommendation will be sent to an Admin for a final decision.
                  </p>
                )}
                {admin && (
                  <p className="text-xs text-ink-secondary italic">
                    No self-review block exists for this decision — please self-police if you are also the submitter.
                  </p>
                )}

                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setDecisionModal({ request: r, approved: true })} disabled={busyId === r.id}>
                    <Check className="h-3.5 w-3.5" />
                    {admin ? 'Approve' : 'Recommend Approve'}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setDecisionModal({ request: r, approved: false })} disabled={busyId === r.id}>
                    <X className="h-3.5 w-3.5" />
                    {admin ? 'Reject' : 'Recommend Reject'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Decision reason modal — required for both approve and reject */}
      <Modal
        open={!!decisionModal}
        onClose={() => {
          setDecisionModal(null);
          setDecisionReason('');
        }}
        title={decisionModal?.approved ? 'Approve Royalty Change' : 'Reject Royalty Change'}
        description={decisionModal ? `${decisionModal.approved ? 'Approve' : 'Reject'} the royalty change request for ${salonLabel(decisionModal.request)}.` : ''}
        primaryLabel={busyId === decisionModal?.request.id ? 'Submitting...' : decisionModal?.approved ? 'Approve' : 'Reject'}
        primaryVariant={decisionModal?.approved ? 'primary' : 'danger'}
        primaryDisabled={!decisionReason.trim() || busyId === decisionModal?.request.id}
        onPrimary={handleDecision}
      >
        <Textarea
          label="Reason"
          placeholder="Reason for this decision..."
          rows={3}
          value={decisionReason}
          onChange={(e) => setDecisionReason(e.target.value)}
          error={!decisionReason.trim() ? 'A reason is required.' : undefined}
        />
      </Modal>
    </div>
  );
}
