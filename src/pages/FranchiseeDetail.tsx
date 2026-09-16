import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, User as UserIcon, Calendar, Pencil, ShieldAlert } from 'lucide-react';
import {
  getFranchisee,
  updateFranchisee,
  revealSensitiveInfo,
  updateSensitiveInfo,
  type UpdateFranchiseeInput,
} from '@/lib/franchiseesApi';
import { ApiError } from '@/lib/api';
import { requestStepUp } from '@/lib/stepUp';
import { isAdmin } from '@/lib/roles';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Avatar, getInitials } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { SensitiveField } from '@/components/domain/SensitiveField';
import { DocumentsPanel } from '@/components/domain/DocumentsPanel';
import type { Franchisee } from '@/types';

const PAN_PATTERN = /^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/;
const AADHAAR_PATTERN = /^\d{12}$/;

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function FranchiseeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { currentUser } = useApp();
  const admin = isAdmin(currentUser?.roles);

  const [franchisee, setFranchisee] = useState<Franchisee | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    getFranchisee(id)
      .then(setFranchisee)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Failed to load franchisee.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // General-info edit (name/dob/contact/address) — true partial update.
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState<UpdateFranchiseeInput>({});
  const [editBusy, setEditBusy] = useState(false);

  const openEdit = () => {
    if (!franchisee) return;
    setEditForm({
      name: franchisee.name,
      dob: franchisee.dob,
      contact: franchisee.contact,
      address: franchisee.address,
    });
    setEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!franchisee) return;
    setEditBusy(true);
    try {
      const updated = await updateFranchisee(franchisee.id, editForm);
      setFranchisee(updated);
      showToast('success', 'Franchisee updated.');
      setEditModal(false);
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to update franchisee.');
    } finally {
      setEditBusy(false);
    }
  };

  // Update sensitive info (admin only, step-up gated).
  const [sensitiveModal, setSensitiveModal] = useState(false);
  const [sensitiveForm, setSensitiveForm] = useState({ pan: '', aadhaar: '' });
  const [sensitiveCode, setSensitiveCode] = useState('');
  const [sensitiveBusy, setSensitiveBusy] = useState(false);
  const [sensitiveError, setSensitiveError] = useState<string | null>(null);

  const handleUpdateSensitive = async () => {
    if (!franchisee) return;
    if (!PAN_PATTERN.test(sensitiveForm.pan.trim())) {
      setSensitiveError('Enter a valid PAN (e.g. ABCDE1234F).');
      return;
    }
    if (!AADHAAR_PATTERN.test(sensitiveForm.aadhaar.trim())) {
      setSensitiveError('Enter a valid 12-digit Aadhaar number.');
      return;
    }
    if (!/^\d{6}$/.test(sensitiveCode)) {
      setSensitiveError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setSensitiveBusy(true);
    setSensitiveError(null);
    try {
      const { stepUpToken } = await requestStepUp(sensitiveCode);
      await updateSensitiveInfo(franchisee.id, { pan: sensitiveForm.pan.trim(), aadhaar: sensitiveForm.aadhaar.trim() }, stepUpToken);
      showToast('success', 'Sensitive info updated.');
      setSensitiveModal(false);
      setSensitiveCode('');
      load();
    } catch (err) {
      setSensitiveError(err instanceof ApiError ? err.message : 'Failed to update sensitive info.');
    } finally {
      setSensitiveBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  if (loadError || !franchisee) {
    return (
      <EmptyState
        title="Franchisee not found"
        message={loadError ?? 'This franchisee record may have been removed.'}
        action={<Button onClick={() => navigate('/franchisees')}>Back to Franchisees</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/franchisees')}
        className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-brand-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Franchisees
      </button>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar initials={getInitials(franchisee.name || franchisee.id)} size="lg" />
            <div>
              <h1 className="text-xl font-bold text-ink">{franchisee.name || `Franchisee #${franchisee.id}`}</h1>
              <p className="text-sm text-ink-secondary mt-1">Created {formatDate(franchisee.createdAt)}</p>
            </div>
          </div>
          <Button variant="secondary" onClick={openEdit}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <InfoRow icon={UserIcon} label="Contact" value={franchisee.contact || '—'} />
          <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(franchisee.dob)} />
          <InfoRow label="Address" value={franchisee.address || '—'} />
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-ink">Sensitive Information</h2>
          {admin && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSensitiveForm({ pan: '', aadhaar: '' });
                setSensitiveCode('');
                setSensitiveError(null);
                setSensitiveModal(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Update
            </Button>
          )}
        </div>
        {admin ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-ink-secondary font-medium mb-1">PAN</p>
              <SensitiveField
                label="PAN"
                maskedValue={franchisee.panLast4 ? `•••• ${franchisee.panLast4}` : '—'}
                onReveal={async (stepUpToken) => (await revealSensitiveInfo(franchisee.id, stepUpToken)).pan}
              />
            </div>
            <div>
              <p className="text-xs text-ink-secondary font-medium mb-1">Aadhaar</p>
              <SensitiveField
                label="Aadhaar"
                maskedValue={franchisee.aadhaarLast4 ? `•••• ${franchisee.aadhaarLast4}` : '—'}
                onReveal={async (stepUpToken) => (await revealSensitiveInfo(franchisee.id, stepUpToken)).aadhaar}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InfoRow label="PAN" value={franchisee.panLast4 ? `•••• ${franchisee.panLast4}` : '—'} />
            <InfoRow label="Aadhaar" value={franchisee.aadhaarLast4 ? `•••• ${franchisee.aadhaarLast4}` : '—'} />
          </div>
        )}
      </Card>

      <DocumentsPanel entityType="FRANCHISEE" entityId={franchisee.id} />

      {/* Edit modal */}
      <Modal
        open={editModal}
        onClose={() => setEditModal(false)}
        title="Edit Franchisee"
        primaryLabel={editBusy ? 'Saving...' : 'Save Changes'}
        primaryDisabled={editBusy}
        onPrimary={handleSaveEdit}
      >
        <div className="space-y-4">
          <Input label="Name" value={editForm.name ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
          <Input
            label="Date of birth"
            type="date"
            value={editForm.dob ?? ''}
            onChange={(e) => setEditForm((f) => ({ ...f, dob: e.target.value }))}
          />
          <Input label="Contact" value={editForm.contact ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, contact: e.target.value }))} />
          <Input label="Address" value={editForm.address ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} />
        </div>
      </Modal>

      {/* Update sensitive info modal (admin only, step-up gated) */}
      <Modal
        open={sensitiveModal}
        onClose={() => setSensitiveModal(false)}
        title="Update Sensitive Info"
        description="Requires a fresh verification code."
        primaryLabel={sensitiveBusy ? 'Saving...' : 'Save'}
        primaryDisabled={sensitiveBusy}
        onPrimary={handleUpdateSensitive}
      >
        <div className="space-y-4">
          {sensitiveError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-status-rejected">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              {sensitiveError}
            </div>
          )}
          <Input
            label="PAN"
            placeholder="ABCDE1234F"
            value={sensitiveForm.pan}
            onChange={(e) => setSensitiveForm((f) => ({ ...f, pan: e.target.value.toUpperCase() }))}
          />
          <Input
            label="Aadhaar"
            placeholder="123456789012"
            value={sensitiveForm.aadhaar}
            onChange={(e) => setSensitiveForm((f) => ({ ...f, aadhaar: e.target.value.replace(/\D/g, '').slice(0, 12) }))}
          />
          <Input
            label="Verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            value={sensitiveCode}
            onChange={(e) => setSensitiveCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </div>
      </Modal>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon?: typeof UserIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-surface-subtle px-4 py-3.5">
      {Icon && (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-brand-600 shrink-0">
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs text-ink-secondary font-medium">{label}</p>
        <p className="text-sm text-ink mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}
