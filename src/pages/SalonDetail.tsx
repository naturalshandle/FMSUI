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
  Plus,
  RefreshCw,
  Ban,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { getSalon, transferSalonFirm } from '@/lib/salonsApi';
import { listFirmsAdmin } from '@/lib/firmsApi';
import { listOfficials } from '@/lib/officialsApi';
import {
  listAgreements,
  createAgreement,
  updateAgreement,
  renewAgreement,
  terminateAgreement,
} from '@/lib/agreementsApi';
import { ApiError } from '@/lib/api';
import type { Agreement, Firm, Official, Salon } from '@/types';

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const emptyAgreementForm = { validFrom: '', validTill: '', contractYear: '', renewalYear: '', royaltyTerms: '' };

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
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState<Agreement | null>(null);
  const [renewModal, setRenewModal] = useState<Agreement | null>(null);
  const [terminateModal, setTerminateModal] = useState<Agreement | null>(null);
  const [agreementForm, setAgreementForm] = useState(emptyAgreementForm);
  const [terminateReason, setTerminateReason] = useState('');
  const [busy, setBusy] = useState(false);

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
    listAgreements(id, true)
      .then(setAgreements)
      .catch(() => setAgreements([]))
      .finally(() => setAgreementsLoading(false));
  }, [id]);

  useEffect(() => {
    load();
    loadAgreements();
  }, [load, loadAgreements]);

  useEffect(() => {
    listOfficials({ size: 500 })
      .then((page) => setOfficials(page.content))
      .catch(() => setOfficials([]));
  }, []);

  useEffect(() => {
    if (!transferModal) return;
    listFirmsAdmin({ size: 200 })
      .then((page) => setFirms(page.content))
      .catch(() => setFirms([]));
  }, [transferModal]);

  const officialName = (officialId?: string) => {
    if (!officialId) return '—';
    const o = officials.find((of) => of.id === officialId);
    return o ? o.name : `#${officialId}`;
  };

  const { currentAgreement, historyAgreements } = useMemo(() => {
    const active = agreements.find((a) => a.status === 'ACTIVE') ?? agreements[agreements.length - 1] ?? null;
    const rest = agreements.filter((a) => a.id !== active?.id);
    return { currentAgreement: active, historyAgreements: rest };
  }, [agreements]);

  const handleTransfer = async () => {
    if (!salon || !newFirmId || !transferReason.trim()) return;
    setBusy(true);
    try {
      await transferSalonFirm(salon.id, newFirmId, transferReason, true);
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

  const handleCreateAgreement = async () => {
    if (!salon || !agreementForm.validFrom || !agreementForm.validTill) return;
    setBusy(true);
    try {
      await createAgreement(salon.id, {
        validFrom: agreementForm.validFrom,
        validTill: agreementForm.validTill,
        contractYear: agreementForm.contractYear ? Number(agreementForm.contractYear) : undefined,
        renewalYear: agreementForm.renewalYear ? Number(agreementForm.renewalYear) : undefined,
        royaltyTerms: agreementForm.royaltyTerms.trim() || undefined,
      }, true);
      showToast('success', 'Agreement created.');
      setCreateModal(false);
      setAgreementForm(emptyAgreementForm);
      loadAgreements();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to create agreement.');
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (a: Agreement) => {
    setEditModal(a);
    setAgreementForm({
      validFrom: a.validFrom,
      validTill: a.validTill,
      contractYear: a.contractYear != null ? String(a.contractYear) : '',
      renewalYear: a.renewalYear != null ? String(a.renewalYear) : '',
      royaltyTerms: a.royaltyTerms ?? '',
    });
  };

  const handleEditAgreement = async () => {
    if (!editModal) return;
    setBusy(true);
    try {
      await updateAgreement(editModal.id, {
        validFrom: agreementForm.validFrom || undefined,
        contractYear: agreementForm.contractYear ? Number(agreementForm.contractYear) : undefined,
        renewalYear: agreementForm.renewalYear ? Number(agreementForm.renewalYear) : undefined,
        royaltyTerms: agreementForm.royaltyTerms.trim() || undefined,
      }, true);
      showToast('success', 'Agreement updated.');
      setEditModal(null);
      loadAgreements();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to update agreement.');
    } finally {
      setBusy(false);
    }
  };

  const openRenew = (a: Agreement) => {
    setRenewModal(a);
    setAgreementForm({ validFrom: '', validTill: '', contractYear: '', renewalYear: '', royaltyTerms: a.royaltyTerms ?? '' });
  };

  const handleRenew = async () => {
    if (!renewModal || !agreementForm.validFrom || !agreementForm.validTill) return;
    setBusy(true);
    try {
      await renewAgreement(renewModal.id, {
        validFrom: agreementForm.validFrom,
        validTill: agreementForm.validTill,
        contractYear: agreementForm.contractYear ? Number(agreementForm.contractYear) : undefined,
        renewalYear: agreementForm.renewalYear ? Number(agreementForm.renewalYear) : undefined,
        royaltyTerms: agreementForm.royaltyTerms.trim() || undefined,
      }, true);
      showToast('success', 'Agreement renewed. The previous agreement is now superseded.');
      setRenewModal(null);
      loadAgreements();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to renew agreement.');
    } finally {
      setBusy(false);
    }
  };

  const handleTerminate = async () => {
    if (!terminateModal || !terminateReason.trim()) return;
    setBusy(true);
    try {
      await terminateAgreement(terminateModal.id, terminateReason, true);
      showToast('info', 'Agreement terminated.');
      setTerminateModal(null);
      setTerminateReason('');
      loadAgreements();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to terminate agreement.');
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
              <h1 className="text-xl font-bold text-ink">{salon.salonName}</h1>
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

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-base font-semibold text-ink mb-4">Salon Details</h2>
          <div className="space-y-4">
            <DetailRow icon={Store} label="Salon Name" value={salon.salonName} />
            <DetailRow icon={MapPin} label="Address" value={salon.address || '—'} />
            <DetailRow icon={Calendar} label="Launch Date" value={formatDate(salon.launchDate)} />
            <DetailRow icon={Store} label="Format / Sq.ft" value={`${salon.salonFormat || '—'} / ${salon.squareFootage ?? '—'}`} />
            <DetailRow icon={MapPin} label="Region" value={salon.region || '—'} />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-semibold text-ink mb-4">Officials Assigned</h2>
          <div className="space-y-4">
            <DetailRow icon={Building2} label="Cluster Head" value={officialName(salon.clusterHeadId)} />
            <DetailRow icon={Building2} label="Regional Head" value={officialName(salon.regionalHeadId)} />
            <DetailRow icon={Building2} label="State Head" value={officialName(salon.stateHeadId)} />
          </div>
        </Card>
      </div>

      {/* Agreements */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-ink">Agreement</h2>
          {!currentAgreement && (
            <Button size="sm" onClick={() => setCreateModal(true)}>
              <Plus className="h-3.5 w-3.5" />
              Create Agreement
            </Button>
          )}
        </div>

        {agreementsLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !currentAgreement ? (
          <EmptyState title="No agreement on file" message="Create an agreement to establish contract terms for this salon." icon={<FileText className="h-8 w-8" />} />
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-brand-100 bg-brand-50/40 px-5 py-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">Current Agreement</span>
                  <Badge kind="VERIFIED" label={currentAgreement.status ?? 'ACTIVE'} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(currentAgreement)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => openRenew(currentAgreement)}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Renew
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setTerminateModal(currentAgreement)}>
                    <Ban className="h-3.5 w-3.5" />
                    Terminate
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-ink-secondary">Valid From</p>
                  <p className="text-ink font-medium">{formatDate(currentAgreement.validFrom)}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-secondary">Valid Till</p>
                  <p className="text-ink font-medium">{formatDate(currentAgreement.validTill)}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-secondary">Contract Year</p>
                  <p className="text-ink font-medium">{currentAgreement.contractYear ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-secondary">Renewal Year</p>
                  <p className="text-ink font-medium">{currentAgreement.renewalYear ?? '—'}</p>
                </div>
                {currentAgreement.royaltyTerms && (
                  <div className="col-span-2 sm:col-span-4">
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
                        <Badge kind="DRAFT" label={a.status ?? 'SUPERSEDED'} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Transfer modal */}
      <Modal
        open={transferModal}
        onClose={() => {
          setTransferModal(false);
          setNewFirmId('');
          setTransferReason('');
        }}
        title="Transfer Salon to Different Firm"
        description={`Reassign ${salon.salonName} to a new firm.`}
        primaryLabel="Confirm Transfer"
        primaryDisabled={!newFirmId || !transferReason.trim() || busy}
        onPrimary={handleTransfer}
      >
        <div className="space-y-4">
          <Select label="New Firm" value={newFirmId} onChange={(e) => setNewFirmId(e.target.value)}>
            <option value="">Select a firm...</option>
            {firms
              .filter((f) => f.id !== salon.firmId)
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

      {/* Create agreement modal */}
      <Modal
        open={createModal}
        onClose={() => {
          setCreateModal(false);
          setAgreementForm(emptyAgreementForm);
        }}
        title="Create Agreement"
        description={`Establish contract terms for ${salon.salonName}.`}
        primaryLabel={busy ? 'Saving...' : 'Create Agreement'}
        primaryDisabled={!agreementForm.validFrom || !agreementForm.validTill || busy}
        onPrimary={handleCreateAgreement}
      >
        <AgreementFormFields form={agreementForm} setForm={setAgreementForm} />
      </Modal>

      {/* Edit agreement modal — validTill intentionally omitted, use Renew instead */}
      <Modal
        open={!!editModal}
        onClose={() => setEditModal(null)}
        title="Edit Agreement"
        description="Valid Till cannot be changed here — use Renew to extend the contract term."
        primaryLabel={busy ? 'Saving...' : 'Save Changes'}
        primaryDisabled={busy}
        onPrimary={handleEditAgreement}
      >
        <div className="space-y-4">
          <Input
            label="Valid From"
            type="date"
            value={agreementForm.validFrom}
            onChange={(e) => setAgreementForm({ ...agreementForm, validFrom: e.target.value })}
          />
          <Input label="Valid Till" type="date" value={agreementForm.validTill} disabled className="opacity-60" />
          <p className="text-xs text-ink-secondary -mt-2">Read-only here — use Renew to change the end date.</p>
          <Input
            label="Contract Year"
            type="number"
            value={agreementForm.contractYear}
            onChange={(e) => setAgreementForm({ ...agreementForm, contractYear: e.target.value })}
          />
          <Input
            label="Renewal Year"
            type="number"
            value={agreementForm.renewalYear}
            onChange={(e) => setAgreementForm({ ...agreementForm, renewalYear: e.target.value })}
          />
          <Textarea
            label="Royalty Terms"
            rows={2}
            value={agreementForm.royaltyTerms}
            onChange={(e) => setAgreementForm({ ...agreementForm, royaltyTerms: e.target.value })}
          />
        </div>
      </Modal>

      {/* Renew modal */}
      <Modal
        open={!!renewModal}
        onClose={() => setRenewModal(null)}
        title="Renew Agreement"
        description="Creates a new agreement record and supersedes the current one."
        primaryLabel={busy ? 'Renewing...' : 'Renew Agreement'}
        primaryDisabled={!agreementForm.validFrom || !agreementForm.validTill || busy}
        onPrimary={handleRenew}
      >
        <AgreementFormFields form={agreementForm} setForm={setAgreementForm} />
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

function AgreementFormFields({
  form,
  setForm,
}: {
  form: typeof emptyAgreementForm;
  setForm: (f: typeof emptyAgreementForm) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Valid From" type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
        <Input label="Valid Till" type="date" value={form.validTill} onChange={(e) => setForm({ ...form, validTill: e.target.value })} />
        <Input label="Contract Year" type="number" value={form.contractYear} onChange={(e) => setForm({ ...form, contractYear: e.target.value })} />
        <Input label="Renewal Year" type="number" value={form.renewalYear} onChange={(e) => setForm({ ...form, renewalYear: e.target.value })} />
      </div>
      <Textarea label="Royalty Terms" rows={2} value={form.royaltyTerms} onChange={(e) => setForm({ ...form, royaltyTerms: e.target.value })} />
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Store;
  label: string;
  value: string;
}) {
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
