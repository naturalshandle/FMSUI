import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Scissors,
  MapPin,
  Calendar,
  Building2,
  ChevronRight,
  Repeat,
  Store,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select, Textarea } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import type { Salon, Firm } from '@/types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function SalonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { franchisees, franchiseesLoading, transferSalonFirm } = useApp();
  const { showToast } = useToast();
  const loading = franchiseesLoading;
  const [transferModal, setTransferModal] = useState(false);
  const [newFirmId, setNewFirmId] = useState('');
  const [transferReason, setTransferReason] = useState('');

  const allFirms = useMemo(() => franchisees.flatMap((f) => f.firms), [franchisees]);

  const { salon, currentFirm } = useMemo(() => {
    for (const firm of allFirms) {
      const salonMatch = firm.salons.find((sal) => sal.id === id);
      if (salonMatch) return { salon: salonMatch, currentFirm: firm };
    }
    return { salon: null as Salon | null, currentFirm: null as Firm | null };
  }, [allFirms, id]);

  const handleTransfer = async () => {
    if (!salon || !newFirmId || !transferReason.trim()) return;
    try {
      await transferSalonFirm(salon.id, newFirmId, transferReason);
      const targetFirm = allFirms.find((f) => f.id === newFirmId);
      showToast('success', `Salon transferred to ${targetFirm?.legalName ?? 'new firm'}.`);
      setTransferModal(false);
      setNewFirmId('');
      setTransferReason('');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to transfer salon.');
    }
  };

  if (loading || !salon) {
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
                Salon #{salon.id}
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
            <DetailRow icon={Calendar} label="Opening Date" value={salon.openingDate ? formatDate(salon.openingDate) : '—'} />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-semibold text-ink mb-4">Current Firm</h2>
          {currentFirm ? (
            <div
              onClick={() => navigate(`/firm/${currentFirm.id}`)}
              className="flex items-center gap-4 rounded-xl border border-brand-50 bg-surface-subtle px-5 py-4 cursor-pointer hover:border-brand-200 hover:bg-brand-50/50 transition-all group"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-ink group-hover:text-brand-700 transition-colors">
                  {currentFirm.legalName}
                </p>
                <p className="text-xs text-ink-secondary mt-0.5">
                  GST: {currentFirm.gstNumber}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-ink-secondary/30 group-hover:text-brand-600 transition-colors" />
            </div>
          ) : (
            <p className="text-sm text-ink-secondary">Firm information not available.</p>
          )}
        </Card>
      </div>

      {/* Transfer modal */}
      <Modal
        open={transferModal}
        onClose={() => {
          setTransferModal(false);
          setNewFirmId('');
          setTransferReason('');
        }}
        title="Transfer Salon to Different Firm"
        description={`Reassign ${salon.salonName} from ${currentFirm?.legalName ?? 'current firm'} to a new firm.`}
        primaryLabel="Confirm Transfer"
        primaryDisabled={!newFirmId || !transferReason.trim()}
        onPrimary={handleTransfer}
      >
        <div className="space-y-4">
          <Select label="New Firm" value={newFirmId} onChange={(e) => setNewFirmId(e.target.value)}>
            <option value="">Select a firm...</option>
            {allFirms
              .filter((f) => f.id !== currentFirm?.id)
              .map((f) => (
                <option key={f.id} value={f.id}>
                  {f.legalName} ({f.gstNumber})
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
