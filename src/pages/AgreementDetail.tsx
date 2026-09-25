import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Ban, CalendarClock, FileText, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { StatusBadge, type StatusBucket } from '@/components/ui/StatusBadge';
import { AgreementExpiryChip } from '@/components/domain/AgreementExpiryChip';
import { getAgreement, renewAgreement, terminateAgreement } from '@/lib/agreementsApi';
import { getSalon } from '@/lib/salonsApi';
import { formatLocalDate, getExpiryInfo } from '@/lib/agreementExpiry';
import { ApiError } from '@/lib/api';
import type { Agreement, AgreementStatus } from '@/types';

const agreementStatusBucket: Record<AgreementStatus, StatusBucket> = {
  ACTIVE: 'positive',
  SUPERSEDED: 'closed',
  TERMINATED: 'negative',
};

/** /agreements/:id — the landing page for agreement notifications and the
 * "View Agreement" button in expiry-reminder emails. */
export function AgreementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [salonName, setSalonName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [renewOpen, setRenewOpen] = useState(false);
  const [renewForm, setRenewForm] = useState({ validFrom: '', newValidTill: '', royaltyTerms: '' });
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [terminateReason, setTerminateReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    getAgreement(id)
      .then(setAgreement)
      .catch((err) => {
        setAgreement(null);
        setLoadError(err instanceof ApiError ? err.message : 'Failed to load agreement.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const salonId = agreement?.salonId;
  useEffect(() => {
    if (!salonId) return;
    let cancelled = false;
    setSalonName(null);
    getSalon(salonId)
      .then((s) => !cancelled && setSalonName(s.name))
      .catch(() => {
        // Name is decorative — fall back to the id below.
      });
    return () => {
      cancelled = true;
    };
  }, [salonId]);

  const openRenew = () => {
    if (!agreement) return;
    setRenewForm({ validFrom: '', newValidTill: '', royaltyTerms: agreement.royaltyTerms ?? '' });
    setRenewOpen(true);
  };

  const handleRenew = async () => {
    if (!agreement || !renewForm.validFrom || !renewForm.newValidTill || !renewForm.royaltyTerms.trim()) return;
    setBusy(true);
    try {
      const created = await renewAgreement(agreement.id, renewForm);
      setRenewOpen(false);
      showToast('success', 'Agreement renewed — viewing the new agreement.');
      navigate(`/agreements/${created.id}`);
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to renew agreement.');
      if (err instanceof ApiError && err.status === 409) {
        setRenewOpen(false);
        load();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleTerminate = async () => {
    if (!agreement || !terminateReason.trim()) return;
    setBusy(true);
    try {
      await terminateAgreement(agreement.id, terminateReason);
      showToast('info', 'Agreement terminated.');
      setTerminateOpen(false);
      setTerminateReason('');
      load();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to terminate agreement.');
      if (err instanceof ApiError && err.status === 409) {
        setTerminateOpen(false);
        load();
      }
    } finally {
      setBusy(false);
    }
  };

  const backButton = (
    <button
      type="button"
      onClick={() => {
        // Arrived straight from an email link → no in-app history to go back to.
        const hasHistory = ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0;
        if (hasHistory) navigate(-1);
        else navigate(agreement ? `/salon/${agreement.salonId}` : '/');
      }}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary hover:text-brand-700 transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </button>
  );

  if (loading && !agreement) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-20" />
        <Card className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  if (loadError || !agreement) {
    return (
      <div className="space-y-6">
        {backButton}
        <Card className="p-6">
          <EmptyState
            title="Couldn't load agreement"
            message={loadError ?? 'Agreement not found'}
            icon={<FileText className="h-8 w-8" />}
          />
        </Card>
      </div>
    );
  }

  const isActive = agreement.status === 'ACTIVE';
  const expiry = getExpiryInfo(agreement);

  return (
    <div className="space-y-6">
      {backButton}

      <Card className="p-6 space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-ink break-words">
              Agreement · {salonName ?? `Salon #${agreement.salonId}`}
            </h1>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <StatusBadge bucket={agreementStatusBucket[agreement.status]} label={agreement.status} />
              <AgreementExpiryChip agreement={agreement} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={!isActive} onClick={openRenew}>
              <RefreshCw className="h-3.5 w-3.5" />
              Renew
            </Button>
            <Button size="sm" variant="danger" disabled={!isActive} onClick={() => setTerminateOpen(true)}>
              <Ban className="h-3.5 w-3.5" />
              Terminate
            </Button>
          </div>
        </div>

        {expiry && (
          <div
            className={`flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3 rounded-xl border px-4 py-3 ${
              expiry.tone === 'red' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {expiry.expired ? (
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              ) : (
                <CalendarClock className="h-5 w-5 shrink-0 mt-0.5" />
              )}
              <p className="text-sm font-medium">
                {expiry.expired
                  ? `This agreement expired on ${formatLocalDate(agreement.validTill)}.`
                  : `${expiry.label} (valid till ${formatLocalDate(agreement.validTill)}).`}
              </p>
            </div>
            {expiry.expired && (
              <Button size="sm" onClick={openRenew}>
                <RefreshCw className="h-3.5 w-3.5" />
                Renew
              </Button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-ink-secondary">Salon</p>
            <Link to={`/salon/${agreement.salonId}`} className="text-brand-700 font-medium hover:underline break-words">
              {salonName ?? `Salon #${agreement.salonId}`}
            </Link>
          </div>
          <div>
            <p className="text-xs text-ink-secondary">Valid From</p>
            <p className="text-ink font-medium">{formatLocalDate(agreement.validFrom)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-secondary">Valid Till</p>
            <p className="text-ink font-medium">{formatLocalDate(agreement.validTill)}</p>
          </div>
          {agreement.statusReason && (
            <div className="sm:col-span-3">
              <p className="text-xs text-ink-secondary">Status Reason</p>
              <p className="text-ink font-medium break-words">{agreement.statusReason}</p>
            </div>
          )}
          <div className="sm:col-span-3">
            <p className="text-xs text-ink-secondary">Royalty Terms</p>
            <p className="text-ink break-words">{agreement.royaltyTerms || '—'}</p>
          </div>
        </div>
      </Card>

      <Modal
        open={renewOpen}
        onClose={() => setRenewOpen(false)}
        title="Renew Agreement"
        description="Creates a new agreement record and supersedes the current one."
        primaryLabel={busy ? 'Renewing...' : 'Renew Agreement'}
        primaryDisabled={!renewForm.validFrom || !renewForm.newValidTill || !renewForm.royaltyTerms.trim() || busy}
        onPrimary={handleRenew}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Valid From" type="date" value={renewForm.validFrom} onChange={(e) => setRenewForm({ ...renewForm, validFrom: e.target.value })} />
            <Input label="New Valid Till" type="date" value={renewForm.newValidTill} onChange={(e) => setRenewForm({ ...renewForm, newValidTill: e.target.value })} />
          </div>
          <Textarea label="Royalty Terms" rows={3} value={renewForm.royaltyTerms} onChange={(e) => setRenewForm({ ...renewForm, royaltyTerms: e.target.value })} />
        </div>
      </Modal>

      <Modal
        open={terminateOpen}
        onClose={() => {
          setTerminateOpen(false);
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
