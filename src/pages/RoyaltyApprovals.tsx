import { useCallback, useEffect, useState } from 'react';
import { Percent, Check, X, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { RoyaltyRequestItem } from '@/components/domain/RoyaltyRequestItem';
import { useApp } from '@/context/AppContext';
import { useMyOfficial, isSalonStateHead } from '@/hooks/useMyOfficial';
import { isAdmin } from '@/lib/roles';
import { ApiError } from '@/lib/api';
import { getSalon } from '@/lib/salonsApi';
import { listOfficials } from '@/lib/officialsApi';
import {
  ROYALTY_APPROVED_MESSAGE,
  submitStateHeadRecommendation,
  submitAdminDecision,
  listPendingRoyaltyRequests,
} from '@/lib/royaltyApi';
import type { Official, RoyaltyRequest, Salon } from '@/types';

export function RoyaltyApprovals() {
  const { showToast } = useToast();
  const { currentUser } = useApp();
  const admin = isAdmin(currentUser?.roles);
  const isStateHead = !!currentUser?.roles.includes('STATE_HEAD');
  const { official: myOfficial } = useMyOfficial();

  const [requests, setRequests] = useState<RoyaltyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Reason is required for BOTH approve and reject — one modal covers both.
  const [decisionModal, setDecisionModal] = useState<{ request: RoyaltyRequest; approved: boolean } | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [officials, setOfficials] = useState<Official[]>([]);
  // Salons are only needed to check State Head assignment (the wire gives salonName).
  const [salons, setSalons] = useState<Record<string, Salon>>({});

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
    if (!isStateHead) return;
    const missing = Array.from(new Set(requests.map((r) => r.salonId))).filter((sid) => !(sid in salons));
    missing.forEach((salonId) => {
      getSalon(salonId)
        .then((salon) => setSalons((prev) => ({ ...prev, [salonId]: salon })))
        .catch(() => undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, isStateHead]);

  const salonLabel = (r: RoyaltyRequest) => r.salonName ?? salons[r.salonId]?.name ?? `Salon #${r.salonId}`;
  const userName = (userId?: string) => {
    if (!userId) return '—';
    const o = officials.find((of) => of.userId === userId);
    return o ? o.name : `User #${userId}`;
  };

  // Admin may decide from either pending state; the State Head only recommends, and
  // only on requests for their own salon that still await them.
  const canAdminDecide = (r: RoyaltyRequest) =>
    admin && (r.overallStatus === 'PENDING_STATE_HEAD' || r.overallStatus === 'PENDING_ADMIN');
  const canRecommend = (r: RoyaltyRequest) =>
    !admin && isStateHead && r.overallStatus === 'PENDING_STATE_HEAD' && isSalonStateHead(myOfficial, salons[r.salonId]);

  const closeModal = () => {
    setDecisionModal(null);
    setDecisionReason('');
  };

  const handleDecision = async () => {
    if (!decisionModal || !decisionReason.trim()) return;
    const { request: r, approved } = decisionModal;
    const reason = decisionReason.trim();
    setBusyId(r.id);
    try {
      if (admin) {
        await submitAdminDecision(r.id, approved, reason);
        showToast('success', approved ? ROYALTY_APPROVED_MESSAGE : "Rejected. The salon's royalty terms are unchanged.");
      } else {
        await submitStateHeadRecommendation(r.id, approved, reason);
        showToast(
          'success',
          `${approved ? 'Approval' : 'Rejection'} recommendation submitted for ${salonLabel(r)}. It now awaits an Admin decision.`,
        );
      }
      closeModal();
      load();
    } catch (err) {
      if (err instanceof ApiError && (err.status === 409 || err.status === 404)) {
        // Someone else moved this request on first (e.g. an Admin override closed it
        // before the State Head recommended). Show why, drop the stale card.
        const fallback = admin
          ? 'This request has already been decided.'
          : 'This request is no longer awaiting a State Head recommendation.';
        showToast('error', err.message || fallback);
        closeModal();
        load();
      } else if (err instanceof ApiError && err.status === 403) {
        showToast('error', admin ? 'Only an Admin can make this decision.' : 'You are not the assigned State Head for this salon.');
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

  const heading = admin ? 'Pending Your Decision' : isStateHead ? 'Pending Your Recommendation' : 'Your Pending Requests';
  const subheading = admin
    ? 'Royalty change requests awaiting a final decision.'
    : isStateHead
      ? 'Royalty change requests on your salons awaiting your recommendation.'
      : 'Royalty change requests you submitted that are still open.';

  const isOverride = decisionModal?.request.overallStatus === 'PENDING_STATE_HEAD' && admin;
  const verb = decisionModal?.approved ? 'Approve' : 'Reject';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">{heading}</h1>
        <p className="text-sm text-ink-secondary mt-1">{subheading}</p>
      </div>

      <Card className="p-6">
        {loadError ? (
          <EmptyState title="Couldn't load pending requests" message={loadError} action={<Button onClick={load}>Retry</Button>} />
        ) : requests.length === 0 ? (
          <EmptyState title="Nothing pending your review right now" message="" icon={<Percent className="h-8 w-8" />} />
        ) : (
          <div className="divide-y divide-brand-50">
            {requests.map((r) => {
              const adminActs = canAdminDecide(r);
              const shActs = canRecommend(r);
              return (
                <RoyaltyRequestItem key={r.id} request={r} userName={userName} title={salonLabel(r)}>
                  {adminActs && r.overallStatus === 'PENDING_STATE_HEAD' && (
                    <p className="flex items-center gap-1.5 text-xs text-orange-700">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      The State Head hasn't recommended yet. Deciding now overrides and skips the State Head.
                    </p>
                  )}
                  {shActs && (
                    <p className="text-xs text-ink-secondary italic">
                      Your recommendation is advisory. Either way, the request goes to an Admin for the final decision.
                    </p>
                  )}
                  {(adminActs || shActs) && (
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
                  )}
                </RoyaltyRequestItem>
              );
            })}
          </div>
        )}
      </Card>

      {/* Decision reason modal — required for both approve and reject */}
      <Modal
        open={!!decisionModal}
        onClose={closeModal}
        title={
          admin
            ? `${verb} Royalty Change`
            : decisionModal?.approved
              ? 'Recommend Approval'
              : 'Recommend Rejection'
        }
        description={
          decisionModal
            ? admin
              ? `${verb} the royalty change for ${salonLabel(decisionModal.request)}. This decision is final.`
              : `Send your recommendation for ${salonLabel(decisionModal.request)} to an Admin.`
            : ''
        }
        primaryLabel={busyId === decisionModal?.request.id ? 'Submitting...' : admin ? verb : 'Submit Recommendation'}
        primaryVariant={admin && !decisionModal?.approved ? 'danger' : 'primary'}
        primaryDisabled={!decisionReason.trim() || busyId === decisionModal?.request.id}
        onPrimary={handleDecision}
      >
        <div className="space-y-4">
          {isOverride && (
            <div className="flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>This skips the State Head. The request is still awaiting their recommendation, and deciding now records an override.</span>
            </div>
          )}
          <Textarea
            label="Reason"
            placeholder="Reason for this decision..."
            rows={3}
            value={decisionReason}
            onChange={(e) => setDecisionReason(e.target.value)}
            error={!decisionReason.trim() ? 'A reason is required.' : undefined}
          />
        </div>
      </Modal>
    </div>
  );
}
