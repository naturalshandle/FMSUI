import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Scissors,
  Landmark,
  FileText,
  Wallet,
  ChevronRight,
  Repeat,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select, Textarea } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import type { Firm, Franchisee } from '@/types';

const firmTypeLabels: Record<string, string> = {
  PROPRIETORSHIP: 'Proprietorship',
  PRIVATE_LIMITED: 'Private Limited',
  LLP: 'LLP',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function FirmDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { franchisees, franchiseesLoading, transferFirmOwnership } = useApp();
  const { showToast } = useToast();
  const loading = franchiseesLoading;
  const [transferModal, setTransferModal] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState('');
  const [transferReason, setTransferReason] = useState('');

  const { firm, owner } = useMemo(() => {
    for (const f of franchisees) {
      const firmMatch = f.firms.find((firm) => firm.id === id);
      if (firmMatch) return { firm: firmMatch, owner: f };
    }
    return { firm: null as Firm | null, owner: null as Franchisee | null };
  }, [franchisees, id]);

  const handleTransfer = async () => {
    if (!firm || !newOwnerId || !transferReason.trim()) return;
    try {
      await transferFirmOwnership(firm.id, newOwnerId, transferReason);
      showToast('success', `Firm ownership transferred to Franchisee #${newOwnerId}.`);
      setTransferModal(false);
      setNewOwnerId('');
      setTransferReason('');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to transfer ownership.');
    }
  };

  if (loading || !firm) {
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

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/firms')}
        className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-brand-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Firms
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
                {firmTypeLabels[firm.firmType]} · {firm.gstNumber}
              </p>
            </div>
          </div>
          <Button onClick={() => setTransferModal(true)}>
            <Repeat className="h-4 w-4" />
            Transfer Ownership
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
            <DetailRow icon={Landmark} label="Firm Type" value={firmTypeLabels[firm.firmType]} />
            <DetailRow icon={FileText} label="GST Number" value={firm.gstNumber} />
            <DetailRow icon={FileText} label="PAN" value={firm.pan} />
            <DetailRow
              icon={Wallet}
              label="Bank Account (Last 4)"
              value={`•••• •••• •••• ${firm.bankAccountLast4}`}
            />
          </div>
        </Card>

        {/* Current owner */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-ink mb-4">Current Owner</h2>
          {owner ? (
            <div
              onClick={() => navigate(`/franchisee/${owner.id}`)}
              className="flex items-center gap-4 rounded-xl border border-brand-50 bg-surface-subtle px-5 py-4 cursor-pointer hover:border-brand-200 hover:bg-brand-50/50 transition-all group"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-400 text-white font-semibold">
                {(owner.pan || owner.id).slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-ink group-hover:text-brand-700 transition-colors">
                  Franchisee #{owner.id}
                </p>
                <p className="text-xs text-ink-secondary mt-0.5">
                  PAN: {owner.pan || '—'} · {owner.franchiseeType === 'INDIVIDUAL' ? 'Individual' : 'Company'}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-ink-secondary/30 group-hover:text-brand-600 transition-colors" />
            </div>
          ) : (
            <p className="text-sm text-ink-secondary">Owner information not available.</p>
          )}
        </Card>
      </div>

      {/* Salons under this firm */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-ink mb-4">Salons Under This Firm</h2>
        {firm.salons.length === 0 ? (
          <EmptyState title="No salons" message="This firm has no salons currently assigned." />
        ) : (
          <div className="space-y-3">
            {firm.salons.map((sal) => (
              <div
                key={sal.id}
                onClick={() => navigate(`/salon/${sal.id}`)}
                className="flex items-center gap-4 rounded-xl border border-brand-50 bg-surface-subtle px-5 py-4 cursor-pointer hover:border-brand-200 hover:bg-brand-50/50 transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Scissors className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink group-hover:text-brand-700 transition-colors">
                    {sal.salonName}
                  </p>
                  <p className="text-xs text-ink-secondary mt-0.5 truncate">
                    {sal.address || '—'}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-ink-secondary/30 group-hover:text-brand-600 transition-colors" />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Transfer modal */}
      <Modal
        open={transferModal}
        onClose={() => {
          setTransferModal(false);
          setNewOwnerId('');
          setTransferReason('');
        }}
        title="Transfer Firm Ownership"
        description={`Transfer ownership of ${firm.legalName} to a different franchisee.`}
        primaryLabel="Confirm Transfer"
        primaryDisabled={!newOwnerId || !transferReason.trim()}
        onPrimary={handleTransfer}
      >
        <div className="space-y-4">
          <Select label="New Owner" value={newOwnerId} onChange={(e) => setNewOwnerId(e.target.value)}>
            <option value="">Select a franchisee...</option>
            {franchisees
              .filter((f) => f.id !== owner?.id)
              .map((f) => (
                <option key={f.id} value={f.id}>
                  Franchisee #{f.id} ({f.pan || 'no PAN'})
                </option>
              ))}
          </Select>
          <Textarea
            label="Reason for transfer"
            placeholder="E.g. acquisition, retirement, restructuring..."
            rows={3}
            value={transferReason}
            onChange={(e) => setTransferReason(e.target.value)}
            error={!transferReason.trim() && transferModal ? 'A reason is required.' : undefined}
          />
        </div>
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
