import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Landmark,
  FileText,
  UserPlus,
  UserMinus,
  Star,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select, Textarea } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { getFirm, addFirmOwner, removeFirmOwner, makeFirmOwnerPrimary } from '@/lib/firmsApi';
import { searchFranchisees } from '@/lib/franchiseesApi';
import { ApiError } from '@/lib/api';
import type { Firm, Franchisee } from '@/types';

const companyTypeLabels: Record<string, string> = {
  PROPRIETORSHIP: 'Proprietorship',
  PARTNERSHIP: 'Partnership',
  PRIVATE_LIMITED: 'Private Limited',
  LLP: 'LLP',
};

export function FirmDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [firm, setFirm] = useState<Firm | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [addOwnerModal, setAddOwnerModal] = useState(false);
  const [removeOwnerModal, setRemoveOwnerModal] = useState<{ franchiseeId: string; name: string } | null>(null);
  const [makePrimaryModal, setMakePrimaryModal] = useState<{ franchiseeId: string; name: string } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const [candidateFranchisees, setCandidateFranchisees] = useState<Franchisee[]>([]);
  const [newOwnerId, setNewOwnerId] = useState('');

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    getFirm(id)
      .then(setFirm)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Failed to load firm.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!addOwnerModal) return;
    searchFranchisees({ size: 100 })
      .then((page) => setCandidateFranchisees(page.content))
      .catch(() => setCandidateFranchisees([]));
  }, [addOwnerModal]);

  const handleAddOwner = async () => {
    if (!firm || !newOwnerId) return;
    setBusy(true);
    try {
      await addFirmOwner(firm.id, Number(newOwnerId), reason || 'Adding co-owner');
      showToast('success', 'Owner added to firm.');
      setAddOwnerModal(false);
      setNewOwnerId('');
      setReason('');
      load();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to add owner.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveOwner = async () => {
    if (!firm || !removeOwnerModal || !reason.trim()) return;
    setBusy(true);
    try {
      await removeFirmOwner(firm.id, removeOwnerModal.franchiseeId, reason);
      showToast('success', `${removeOwnerModal.name} removed as owner.`);
      setRemoveOwnerModal(null);
      setReason('');
      load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        showToast('error', err.message);
      } else {
        showToast('error', err instanceof ApiError ? err.message : 'Failed to remove owner.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleMakePrimary = async () => {
    if (!firm || !makePrimaryModal || !reason.trim()) return;
    setBusy(true);
    try {
      await makeFirmOwnerPrimary(firm.id, makePrimaryModal.franchiseeId, reason);
      showToast('success', `${makePrimaryModal.name} is now the primary owner.`);
      setMakePrimaryModal(null);
      setReason('');
      load();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to update primary owner.');
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

  if (loadError || !firm) {
    return (
      <EmptyState
        title="Firm not found"
        message={loadError ?? 'This firm record may have been removed.'}
        action={<Button onClick={() => navigate('/firms')}>Back to Companies</Button>}
      />
    );
  }

  const availableCandidates = candidateFranchisees.filter(
    (f) => !firm.owners.some((o) => o.franchiseeId === f.id),
  );
  const onlyOneOwner = firm.owners.length === 1;

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/firms')}
        className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-brand-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Companies
      </button>

      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-400 text-white">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-ink">{firm.legalName}</h1>
              <p className="text-sm text-ink-secondary mt-1">
                {companyTypeLabels[firm.companyType] ?? firm.companyType} · {firm.gstNumber || 'No GST on file'}
              </p>
            </div>
          </div>
          <Button onClick={() => setAddOwnerModal(true)}>
            <UserPlus className="h-4 w-4" />
            Add Owner
          </Button>
        </div>
      </Card>

      {/* Details grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Firm details */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-ink mb-4">Firm Details</h2>
          <div className="space-y-4">
            <DetailRow icon={Building2} label="Legal Name" value={firm.legalName} />
            <DetailRow icon={Landmark} label="Company Type" value={companyTypeLabels[firm.companyType] ?? firm.companyType} />
            <DetailRow icon={FileText} label="GST Number" value={firm.gstNumber || '—'} />
            <DetailRow icon={FileText} label="FP Code" value={firm.fpCode || '—'} />
          </div>
        </Card>

        {/* Owners list */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-ink mb-4">Owners</h2>
          {firm.owners.length === 0 ? (
            <p className="text-sm text-ink-secondary">No owners on record for this firm.</p>
          ) : (
            <div className="space-y-3">
              {firm.owners.map((owner) => (
                <div
                  key={owner.franchiseeId}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-brand-50 bg-surface-subtle px-5 py-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      onClick={() => navigate(`/franchisee/${owner.franchiseeId}`)}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-400 text-white font-semibold cursor-pointer shrink-0"
                    >
                      {(owner.franchiseeName ?? owner.franchiseeId).slice(0, 2).toUpperCase()}
                    </div>
                    <div
                      onClick={() => navigate(`/franchisee/${owner.franchiseeId}`)}
                      className="flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-ink">
                          {owner.franchiseeName ?? `Franchisee #${owner.franchiseeId}`}
                        </p>
                        {owner.isPrimary && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 text-brand-700 px-2.5 py-0.5 text-xs font-medium">
                            <Star className="h-3 w-3 fill-current" />
                            Primary
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap sm:shrink-0 sm:ml-auto">
                    {!owner.isPrimary && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setMakePrimaryModal({
                            franchiseeId: owner.franchiseeId,
                            name: owner.franchiseeName ?? `Franchisee #${owner.franchiseeId}`,
                          })
                        }
                      >
                        <Star className="h-3.5 w-3.5" />
                        Make Primary
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={onlyOneOwner || (owner.isPrimary && firm.owners.length > 1)}
                      title={
                        onlyOneOwner
                          ? 'Cannot remove the last remaining owner'
                          : owner.isPrimary
                            ? 'Make another owner Primary first'
                            : undefined
                      }
                      onClick={() =>
                        setRemoveOwnerModal({
                          franchiseeId: owner.franchiseeId,
                          name: owner.franchiseeName ?? `Franchisee #${owner.franchiseeId}`,
                        })
                      }
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Add owner modal */}
      <Modal
        open={addOwnerModal}
        onClose={() => {
          setAddOwnerModal(false);
          setNewOwnerId('');
          setReason('');
        }}
        title="Add Owner"
        description={
          firm.owners.length === 0
            ? `This will be ${firm.legalName}'s primary owner.`
            : `Add a co-owner to ${firm.legalName}.`
        }
        primaryLabel="Add Owner"
        primaryDisabled={!newOwnerId}
        onPrimary={handleAddOwner}
      >
        <div className="space-y-4">
          <Select label="Franchisee" value={newOwnerId} onChange={(e) => setNewOwnerId(e.target.value)}>
            <option value="">Select a franchisee...</option>
            {availableCandidates.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name ?? `Franchisee #${f.id}`}
              </option>
            ))}
          </Select>
          <Textarea
            label="Reason"
            placeholder="E.g. adding co-owner..."
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </Modal>

      {/* Remove owner modal */}
      <Modal
        open={!!removeOwnerModal}
        onClose={() => {
          setRemoveOwnerModal(null);
          setReason('');
        }}
        title="Remove Owner"
        description={removeOwnerModal ? `Remove ${removeOwnerModal.name} as an owner of ${firm.legalName}.` : ''}
        primaryLabel="Remove Owner"
        primaryVariant="danger"
        primaryDisabled={!reason.trim() || busy}
        onPrimary={handleRemoveOwner}
      >
        <Textarea
          label="Reason for removal"
          placeholder="E.g. owner exited..."
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={!reason.trim() ? 'A reason is required.' : undefined}
        />
      </Modal>

      {/* Make primary modal */}
      <Modal
        open={!!makePrimaryModal}
        onClose={() => {
          setMakePrimaryModal(null);
          setReason('');
        }}
        title="Make Primary Owner"
        description={makePrimaryModal ? `Make ${makePrimaryModal.name} the primary owner of ${firm.legalName}.` : ''}
        primaryLabel="Confirm"
        primaryDisabled={!reason.trim() || busy}
        onPrimary={handleMakePrimary}
      >
        <Textarea
          label="Reason"
          placeholder="E.g. ownership restructuring..."
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={!reason.trim() ? 'A reason is required.' : undefined}
        />
      </Modal>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-ink-secondary font-medium">{label}</p>
        <p className="text-sm text-ink mt-0.5">{value}</p>
      </div>
    </div>
  );
}
