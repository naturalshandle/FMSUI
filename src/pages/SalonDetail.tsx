import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Scissors,
  MapPin,
  Calendar,
  Building2,
  Repeat,
  Store,
  FileText,
  RefreshCw,
  Ban,
  ChevronDown,
  ChevronUp,
  Percent,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { StatusBadge, type StatusBucket } from '@/components/ui/StatusBadge';
import { DocumentsPanel } from '@/components/domain/DocumentsPanel';
import { SalonAuditsSection } from '@/components/domain/SalonAuditsSection';
import { getSalon, transferSalon } from '@/lib/salonsApi';
import { searchFirms } from '@/lib/firmsApi';
import { listOfficials } from '@/lib/officialsApi';
import { searchAgreements, updateAgreement, renewAgreement, terminateAgreement } from '@/lib/agreementsApi';
import {
  submitRoyaltyRequest,
  listRoyaltyHistory,
  royaltyStatusBucket,
  royaltyStatusLabel,
} from '@/lib/royaltyApi';
import { ApiError } from '@/lib/api';
import type { Agreement, Firm, Official, RoyaltyRequest, Salon, AgreementStatus } from '@/types';

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const agreementStatusBucket: Record<AgreementStatus, StatusBucket> = {
  ACTIVE: 'positive',
  SUPERSEDED: 'closed',
  TERMINATED: 'negative',
};

export function SalonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [salon, setSalon] = useState<Salon | null>(null);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [officials, setOfficials] = useState<Official[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [transferModal, setTransferModal] = useState(false);
  const [newFirmId, setNewFirmId] = useState('');
  const [transferReason, setTransferReason] = useState('');

  // Agreements
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [agreementsLoading, setAgreementsLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editModal, setEditModal] = useState<Agreement | null>(null);
  const [editRoyaltyTerms, setEditRoyaltyTerms] = useState('');
  const [renewModal, setRenewModal] = useState<Agreement | null>(null);
  const [renewForm, setRenewForm] = useState({ validFrom: '', newValidTill: '', royaltyTerms: '' });
  const [terminateModal, setTerminateModal] = useState<Agreement | null>(null);
  const [terminateReason, setTerminateReason] = useState('');
  const [busy, setBusy] = useState(false);

  // Royalty
  const [royaltyHistory, setRoyaltyHistory] = useState<RoyaltyRequest[]>([]);
  const [royaltyHistoryLoading, setRoyaltyHistoryLoading] = useState(true);
  const [royaltyModal, setRoyaltyModal] = useState(false);
  const [royaltyForm, setRoyaltyForm] = useState({ newPercentage: '', newRoyaltyType: '', reason: '', instructedBy: '' });
  const [royaltyBusy, setRoyaltyBusy] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    getSalon(id)
      .then(setSalon)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Failed to load salon.'))
      .finally(() => setLoading(false));
  }, [id]);

  const loadAgreements = useCallback(() => {
    if (!id) return;
    setAgreementsLoading(true);
    searchAgreements({ salonId: id, size: 100 })
      .then((page) => setAgreements(page.content))
      .catch(() => setAgreements([]))
      .finally(() => setAgreementsLoading(false));
  }, [id]);

  const loadRoyaltyHistory = useCallback(() => {
    if (!id) return;
    setRoyaltyHistoryLoading(true);
    listRoyaltyHistory(id)
      .then(setRoyaltyHistory)
      .catch(() => setRoyaltyHistory([]))
      .finally(() => setRoyaltyHistoryLoading(false));
  }, [id]);

  useEffect(() => {
    load();
    loadAgreements();
    loadRoyaltyHistory();
  }, [load, loadAgreements, loadRoyaltyHistory]);

  useEffect(() => {
    listOfficials({ size: 200 })
      .then((page) => setOfficials(page.content))
      .catch(() => setOfficials([]));
  }, []);

  useEffect(() => {
    if (!transferModal) return;
    searchFirms({ size: 100 })
      .then((page) => setFirms(page.content))
      .catch(() => setFirms([]));
  }, [transferModal]);

  const officialName = (officialId?: string) => {
    if (!officialId) return '—';
    const o = officials.find((of) => of.id === officialId);
    return o ? o.name : `#${officialId}`;
  };

  const userName = (userId?: string) => {
    if (!userId) return '—';
    const o = officials.find((of) => of.userId === userId);
    return o ? o.name : `User #${userId}`;
  };

  const { currentAgreement, historyAgreements } = useMemo(() => {
    const active = agreements.find((a) => a.status === 'ACTIVE') ?? agreements[agreements.length - 1] ?? null;
    const rest = agreements.filter((a) => a.id !== active?.id);
    return { currentAgreement: active, historyAgreements: rest };
  }, [agreements]);

  const currentRoyaltyPercentage = useMemo(() => {
    const approved = royaltyHistory.filter((r) => r.overallStatus === 'APPROVED');
    if (approved.length === 0) return null;
    const latest = approved.reduce((a, b) => (new Date(a.updatedAt) > new Date(b.updatedAt) ? a : b));
    return latest.newPercentage;
  }, [royaltyHistory]);

  const handleTransfer = async () => {
    if (!salon || !newFirmId || !transferReason.trim()) return;
    setBusy(true);
    try {
      await transferSalon(salon.id, newFirmId, transferReason);
      const targetFirm = firms.find((f) => f.id === newFirmId);
      showToast('success', `Salon transferred to ${targetFirm?.legalName ?? 'new firm'}.`);
      setTransferModal(false);
      setNewFirmId('');
      setTransferReason('');
      load();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to transfer salon.');
    } finally {
      setBusy(false);
    }
  };

  const handleRequestRoyaltyChange = async () => {
    if (!salon || !royaltyForm.newPercentage.trim() || !royaltyForm.newRoyaltyType.trim() || !royaltyForm.reason.trim()) return;
    setRoyaltyBusy(true);
    try {
      const created = await submitRoyaltyRequest(salon.id, {
        newPercentage: Number(royaltyForm.newPercentage),
        newRoyaltyType: royaltyForm.newRoyaltyType.trim(),
        reason: royaltyForm.reason,
        instructedBy: royaltyForm.instructedBy.trim() || undefined,
      });
      showToast(
        'success',
        created.skippedStateHeadStep
          ? 'Submitted. As the assigned State Head, this skips the recommendation step and goes directly to Admin.'
          : 'Royalty change request submitted for approval.',
      );
      setRoyaltyModal(false);
      setRoyaltyForm({ newPercentage: '', newRoyaltyType: '', reason: '', instructedBy: '' });
      loadRoyaltyHistory();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        showToast('error', "You aren't the assigned Regional Manager, Cluster Manager, or State Head for this salon.");
      } else {
        showToast('error', err instanceof ApiError ? err.message : 'Failed to submit royalty change request.');
      }
    } finally {
      setRoyaltyBusy(false);
    }
  };

  const openEditAgreement = (a: Agreement) => {
    setEditModal(a);
    setEditRoyaltyTerms(a.royaltyTerms ?? '');
  };

  const handleEditAgreement = async () => {
    if (!editModal) return;
    setBusy(true);
    try {
      await updateAgreement(editModal.id, editRoyaltyTerms);
      showToast('success', 'Agreement updated.');
      setEditModal(null);
      loadAgreements();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        showToast('error', err.message);
        setEditModal(null);
      } else {
        showToast('error', err instanceof ApiError ? err.message : 'Failed to update agreement.');
      }
    } finally {
      setBusy(false);
    }
  };

  const openRenew = (a: Agreement) => {
    setRenewModal(a);
    setRenewForm({ validFrom: '', newValidTill: '', royaltyTerms: a.royaltyTerms ?? '' });
  };

  const handleRenew = async () => {
    if (!renewModal || !renewForm.validFrom || !renewForm.newValidTill || !renewForm.royaltyTerms.trim()) return;
    setBusy(true);
    try {
      await renewAgreement(renewModal.id, renewForm);
      showToast('success', 'Agreement renewed — viewing the new agreement.');
      setRenewModal(null);
      loadAgreements();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        showToast('error', err.message);
        setRenewModal(null);
      } else {
        showToast('error', err instanceof ApiError ? err.message : 'Failed to renew agreement.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleTerminate = async () => {
    if (!terminateModal || !terminateReason.trim()) return;
    setBusy(true);
    try {
      await terminateAgreement(terminateModal.id, terminateReason);
      showToast('info', 'Agreement terminated.');
      setTerminateModal(null);
      setTerminateReason('');
      loadAgreements();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        showToast('error', err.message);
        setTerminateModal(null);
      } else {
        showToast('error', err instanceof ApiError ? err.message : 'Failed to terminate agreement.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Card className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-32 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  if (loadError || !salon) {
    return (
      <EmptyState
        title="Salon not found"
        message={loadError ?? 'This salon record may have been removed.'}
        action={<Button onClick={() => navigate('/salons')}>Back to Salons</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/salons')}
        className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-brand-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Salons
      </button>

      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-400 text-white">
              <Scissors className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-ink">{salon.name}</h1>
              <p className="text-sm text-ink-secondary mt-1">
                Salon #{salon.id} {salon.operationalStatus && `· ${salon.operationalStatus}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setTransferModal(true)}>
              <Repeat className="h-4 w-4" />
              Transfer to Different Firm
            </Button>
          </div>
        </div>
      </Card>

      {/* Current Royalty */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 shrink-0">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-ink-secondary font-medium">Current Royalty</p>
              <p className="text-lg font-semibold text-ink">
                {royaltyHistoryLoading ? '…' : currentRoyaltyPercentage != null ? `${currentRoyaltyPercentage}%` : 'Not set'}
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => setRoyaltyModal(true)}>
            <Percent className="h-4 w-4" />
            Request Royalty Change
          </Button>
        </div>
      </Card>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-base font-semibold text-ink mb-4">Salon Details</h2>
          <div className="space-y-4">
            <DetailRow icon={Store} label="Salon Name" value={salon.name} />
            <DetailRow icon={MapPin} label="Address" value={salon.address || '—'} />
            <DetailRow icon={Calendar} label="Launch Date" value={formatDate(salon.launchDate)} />
            <DetailRow icon={Store} label="Format / Sq.ft" value={`${salon.format || '—'} / ${salon.sqFt ?? '—'}`} />
            <DetailRow icon={MapPin} label="Region" value={salon.region || '—'} />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-semibold text-ink mb-4">Officials Assigned</h2>
          <div className="space-y-4">
            <DetailRow icon={Building2} label="Cluster Head" value={officialName(salon.clusterHeadOfficialId)} />
            <DetailRow icon={Building2} label="Regional Head" value={officialName(salon.regionalHeadOfficialId)} />
            <DetailRow icon={Building2} label="State Head" value={officialName(salon.stateHeadOfficialId)} />
          </div>
          <p className="text-xs text-ink-secondary mt-4">
            Reassigning a salon's officials has no defined endpoint in the current backend spec — this is a known
            open item, not a missing feature in this UI.
          </p>
        </Card>
      </div>

      {/* Agreements */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-ink">Agreement</h2>
        </div>

        {agreementsLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !currentAgreement ? (
          <EmptyState title="No agreement on file" message="Agreements are created via the Franchise Creation wizard." icon={<FileText className="h-8 w-8" />} />
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-brand-100 bg-brand-50/40 px-5 py-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">Current Agreement</span>
                  <StatusBadge bucket={agreementStatusBucket[currentAgreement.status]} label={currentAgreement.status} />
                  {currentAgreement.isExpired && <StatusBadge bucket="computed" label="Expired" />}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" disabled={currentAgreement.status !== 'ACTIVE'} onClick={() => openEditAgreement(currentAgreement)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="secondary" disabled={currentAgreement.status !== 'ACTIVE'} onClick={() => openRenew(currentAgreement)}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Renew
                  </Button>
                  <Button size="sm" variant="danger" disabled={currentAgreement.status !== 'ACTIVE'} onClick={() => setTerminateModal(currentAgreement)}>
                    <Ban className="h-3.5 w-3.5" />
                    Terminate
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-ink-secondary">Valid From</p>
                  <p className="text-ink font-medium">{formatDate(currentAgreement.validFrom)}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-secondary">Valid Till</p>
                  <p className="text-ink font-medium">{formatDate(currentAgreement.validTill)}</p>
                </div>
                {currentAgreement.statusReason && (
                  <div>
                    <p className="text-xs text-ink-secondary">Status Reason</p>
                    <p className="text-ink font-medium">{currentAgreement.statusReason}</p>
                  </div>
                )}
                {currentAgreement.royaltyTerms && (
                  <div className="col-span-2 sm:col-span-3">
                    <p className="text-xs text-ink-secondary">Royalty Terms</p>
                    <p className="text-ink">{currentAgreement.royaltyTerms}</p>
                  </div>
                )}
              </div>
            </div>

            {historyAgreements.length > 0 && (
              <div className="rounded-xl border border-brand-50">
                <button
                  type="button"
                  onClick={() => setHistoryOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-ink-secondary"
                >
                  <span>Agreement History ({historyAgreements.length})</span>
                  {historyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {historyOpen && (
                  <div className="divide-y divide-brand-50 border-t border-brand-50">
                    {historyAgreements.map((a) => (
                      <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                        <div>
                          <span className="text-ink">{formatDate(a.validFrom)} – {formatDate(a.validTill)}</span>
                          {a.royaltyTerms && <span className="text-ink-secondary ml-2">· {a.royaltyTerms}</span>}
                        </div>
                        <StatusBadge bucket={agreementStatusBucket[a.status]} label={a.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Royalty History */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-ink mb-4">Royalty History</h2>
        {royaltyHistoryLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : royaltyHistory.length === 0 ? (
          <EmptyState
            title="No royalty change requests yet"
            message="Requests submitted for this salon will appear here, including rejected ones."
            icon={<Percent className="h-8 w-8" />}
          />
        ) : (
          <div className="divide-y divide-brand-50 border-t border-brand-50">
            {royaltyHistory.map((r) => (
              <div key={r.id} className="py-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-ink font-medium">
                      {r.currentPercentage != null ? `${r.currentPercentage}%` : 'Not set'} → {r.newPercentage}%
                    </span>
                    <StatusBadge bucket={royaltyStatusBucket(r.overallStatus)} label={royaltyStatusLabel(r.overallStatus)} />
                  </div>
                  <span className="text-xs text-ink-secondary">{formatDate(r.createdAt)}</span>
                </div>
                <p className="text-sm text-ink">
                  <span className="text-ink-secondary">Reason:</span> {r.reason || '—'}
                  {r.instructedBy && <span className="text-ink-secondary"> · Instructed by: {r.instructedBy}</span>}
                </p>
                <div className="text-xs text-ink-secondary space-y-1">
                  <p>Submitted by {userName(r.requestedBy)}</p>
                  {r.skippedStateHeadStep && <p>Skipped the State Head recommendation step (submitter was the assigned State Head).</p>}
                  {r.stateHeadDecidedAt && (
                    <p>
                      State Head {r.stateHeadDecision === 'APPROVED' ? 'approved' : 'rejected'} on{' '}
                      {formatDate(r.stateHeadDecidedAt)} by {userName(r.stateHeadDecidedBy)}
                      {r.stateHeadReason && ` — ${r.stateHeadReason}`}
                    </p>
                  )}
                  {r.stateHeadDecision === 'APPROVED' && r.adminDecidedAt && (
                    <p>
                      Admin {r.adminDecision === 'APPROVED' ? 'approved' : 'rejected'} on{' '}
                      {formatDate(r.adminDecidedAt)} by {userName(r.adminDecidedBy)}
                      {r.adminReason && ` — ${r.adminReason}`}
                    </p>
                  )}
                  {r.overallStatus === 'PENDING_ADMIN' && <p>Awaiting Admin decision.</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <SalonAuditsSection salonId={salon.id} />

      <DocumentsPanel entityType="SALON" entityId={salon.id} />

      {/* Transfer modal */}
      <Modal
        open={transferModal}
        onClose={() => {
          setTransferModal(false);
          setNewFirmId('');
          setTransferReason('');
        }}
        title="Transfer Salon to Different Firm"
        description={`Reassign ${salon.name} to a new firm.`}
        primaryLabel="Confirm Transfer"
        primaryDisabled={!newFirmId || !transferReason.trim() || busy}
        onPrimary={handleTransfer}
      >
        <div className="space-y-4">
          <Select label="New Firm" value={newFirmId} onChange={(e) => setNewFirmId(e.target.value)}>
            <option value="">Select a firm...</option>
            {firms
              .filter((f) => f.id !== salon.currentFirmId)
              .map((f) => (
                <option key={f.id} value={f.id}>
                  {f.legalName} ({f.gstNumber || 'no GST'})
                </option>
              ))}
          </Select>
          <Textarea
            label="Reason for transfer"
            placeholder="E.g. reorganization, territory reassignment..."
            rows={3}
            value={transferReason}
            onChange={(e) => setTransferReason(e.target.value)}
            error={!transferReason.trim() && transferModal ? 'A reason is required.' : undefined}
          />
        </div>
      </Modal>

      {/* Royalty change request modal */}
      <Modal
        open={royaltyModal}
        onClose={() => {
          setRoyaltyModal(false);
          setRoyaltyForm({ newPercentage: '', newRoyaltyType: '', reason: '', instructedBy: '' });
        }}
        title="Request Royalty Change"
        description={`Submit a royalty change request for ${salon.name}. This goes to the State Head first, then Admin, for approval.`}
        primaryLabel={royaltyBusy ? 'Submitting...' : 'Submit Request'}
        primaryDisabled={!royaltyForm.newPercentage.trim() || !royaltyForm.newRoyaltyType.trim() || !royaltyForm.reason.trim() || royaltyBusy}
        onPrimary={handleRequestRoyaltyChange}
      >
        <div className="space-y-4">
          <Input
            label="Current %"
            value={currentRoyaltyPercentage != null ? `${currentRoyaltyPercentage}%` : 'Not set'}
            disabled
            className="opacity-60"
          />
          <Input
            label="New %"
            type="number"
            min={0}
            max={100}
            step="0.01"
            placeholder="E.g. 8.5"
            value={royaltyForm.newPercentage}
            onChange={(e) => setRoyaltyForm({ ...royaltyForm, newPercentage: e.target.value })}
          />
          <Input
            label="New Royalty Type"
            placeholder="E.g. PERCENTAGE_OF_REVENUE"
            value={royaltyForm.newRoyaltyType}
            onChange={(e) => setRoyaltyForm({ ...royaltyForm, newRoyaltyType: e.target.value })}
          />
          <Textarea
            label="Why"
            placeholder="Reason for this royalty change..."
            rows={3}
            value={royaltyForm.reason}
            onChange={(e) => setRoyaltyForm({ ...royaltyForm, reason: e.target.value })}
            error={!royaltyForm.reason.trim() && royaltyModal ? 'A reason is required.' : undefined}
          />
          <Input
            label="Instructed by (optional)"
            placeholder="E.g. Regional Head name"
            value={royaltyForm.instructedBy}
            onChange={(e) => setRoyaltyForm({ ...royaltyForm, instructedBy: e.target.value })}
          />
        </div>
      </Modal>

      {/* Edit agreement modal — royaltyTerms is the ONLY editable field */}
      <Modal
        open={!!editModal}
        onClose={() => setEditModal(null)}
        title="Edit Agreement"
        description="Only royalty terms can be edited here — dates require Renew."
        primaryLabel={busy ? 'Saving...' : 'Save Changes'}
        primaryDisabled={busy}
        onPrimary={handleEditAgreement}
      >
        <Textarea label="Royalty Terms" rows={3} value={editRoyaltyTerms} onChange={(e) => setEditRoyaltyTerms(e.target.value)} />
      </Modal>

      {/* Renew modal */}
      <Modal
        open={!!renewModal}
        onClose={() => setRenewModal(null)}
        title="Renew Agreement"
        description="Creates a new agreement record and supersedes the current one."
        primaryLabel={busy ? 'Renewing...' : 'Renew Agreement'}
        primaryDisabled={!renewForm.validFrom || !renewForm.newValidTill || !renewForm.royaltyTerms.trim() || busy}
        onPrimary={handleRenew}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Valid From" type="date" value={renewForm.validFrom} onChange={(e) => setRenewForm({ ...renewForm, validFrom: e.target.value })} />
            <Input label="New Valid Till" type="date" value={renewForm.newValidTill} onChange={(e) => setRenewForm({ ...renewForm, newValidTill: e.target.value })} />
          </div>
          <Textarea label="Royalty Terms" rows={3} value={renewForm.royaltyTerms} onChange={(e) => setRenewForm({ ...renewForm, royaltyTerms: e.target.value })} />
        </div>
      </Modal>

      {/* Terminate modal */}
      <Modal
        open={!!terminateModal}
        onClose={() => {
          setTerminateModal(null);
          setTerminateReason('');
        }}
        title="Terminate Agreement"
        description="This ends the agreement immediately. This cannot be undone."
        primaryLabel={busy ? 'Terminating...' : 'Terminate Agreement'}
        primaryVariant="danger"
        primaryDisabled={!terminateReason.trim() || busy}
        onPrimary={handleTerminate}
      >
        <Textarea
          label="Reason"
          placeholder="E.g. mutual termination..."
          rows={3}
          value={terminateReason}
          onChange={(e) => setTerminateReason(e.target.value)}
          error={!terminateReason.trim() ? 'A reason is required.' : undefined}
        />
      </Modal>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Store; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-ink-secondary font-medium">{label}</p>
        <p className="text-sm text-ink mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}
