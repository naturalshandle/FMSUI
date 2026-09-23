import { useEffect, useState } from 'react';
import { Camera, Plus, Upload, Send, CheckCircle2, Flag, Eye, X, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge, type StatusBucket } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { useApp } from '@/context/AppContext';
import { isAdmin } from '@/lib/roles';
import { ApiError } from '@/lib/api';
import {
  startAudit,
  listSalonAudits,
  getSalonAuditDetail,
  uploadAuditPhoto,
  submitAudit,
  reviewSalonAudit,
  fetchAuditPhotoBlob,
  type SalonAudit,
  type SalonAuditDetail,
  type SalonAuditReviewStatus,
} from '@/lib/salonAuditsApi';

const lifecycleBucket: Record<SalonAudit['status'], StatusBucket> = {
  IN_PROGRESS: 'neutral',
  SUBMITTED: 'pending',
};

const reviewBucket: Record<SalonAuditReviewStatus, StatusBucket> = {
  COMPLETE: 'positive',
  FLAGGED: 'negative',
};

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface Props {
  salonId: string;
}

export function SalonAuditsSection({ salonId }: Props) {
  const { showToast } = useToast();
  const { currentUser } = useApp();
  const admin = isAdmin(currentUser?.roles);

  const [audits, setAudits] = useState<SalonAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const [selected, setSelected] = useState<SalonAuditDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [areaLabel, setAreaLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [reviewModal, setReviewModal] = useState<SalonAuditReviewStatus | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);

  const [photoViewer, setPhotoViewer] = useState<{ fileName: string; url: string | null; error: string | null } | null>(null);

  const loadList = () => {
    setLoading(true);
    listSalonAudits(salonId)
      .then(setAudits)
      .catch(() => setAudits([]))
      .finally(() => setLoading(false));
  };

  useEffect(loadList, [salonId]);

  const openAudit = (id: string) => {
    setDetailLoading(true);
    getSalonAuditDetail(id)
      .then(setSelected)
      .catch((err) => showToast('error', err instanceof ApiError ? err.message : 'Failed to load audit.'))
      .finally(() => setDetailLoading(false));
  };

  const handleStart = async () => {
    // No server-side duplicate/date-collision check exists — check client-side first.
    const existingToday = audits.find((a) => a.status === 'IN_PROGRESS' && a.auditDate === todayIso());
    if (existingToday) {
      openAudit(existingToday.id);
      return;
    }
    setStarting(true);
    try {
      const created = await startAudit(salonId);
      showToast('success', 'Audit started.');
      loadList();
      openAudit(created.id);
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to start audit.');
    } finally {
      setStarting(false);
    }
  };

  const handleUpload = async (file: File | null) => {
    if (!file || !selected || !areaLabel.trim()) return;
    setUploading(true);
    try {
      await uploadAuditPhoto(selected.id, areaLabel.trim(), file);
      showToast('success', 'Photo uploaded.');
      setAreaLabel('');
      openAudit(selected.id);
      loadList();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await submitAudit(selected.id);
      showToast('success', 'Audit submitted for review.');
      openAudit(selected.id);
      loadList();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to submit audit.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async () => {
    if (!selected || !reviewModal) return;
    if (reviewModal === 'FLAGGED' && !reviewNotes.trim()) return;
    setReviewBusy(true);
    try {
      await reviewSalonAudit(selected.id, reviewModal, reviewNotes.trim() || undefined);
      showToast('success', reviewModal === 'COMPLETE' ? 'Audit marked complete.' : 'Audit flagged.');
      setReviewModal(null);
      setReviewNotes('');
      openAudit(selected.id);
      loadList();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to submit review.');
    } finally {
      setReviewBusy(false);
    }
  };

  const closePhotoViewer = () => {
    setPhotoViewer((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
  };

  const handleViewPhoto = async (photoId: string, fileName: string) => {
    if (!selected) return;
    setPhotoViewer((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return { fileName, url: null, error: null };
    });
    try {
      const blob = await fetchAuditPhotoBlob(selected.id, photoId);
      const url = URL.createObjectURL(blob);
      setPhotoViewer({ fileName, url, error: null });
    } catch (err) {
      setPhotoViewer({ fileName, url: null, error: err instanceof ApiError ? err.message : 'Failed to load photo.' });
    }
  };

  useEffect(() => {
    if (!photoViewer) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePhotoViewer();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [photoViewer]);

  const isConductor = selected && currentUser?.userId === selected.conductedByUserId;
  const canUpload = selected?.status === 'IN_PROGRESS' && (isConductor || admin);
  const canReview = selected?.status === 'SUBMITTED' && (admin || !isConductor);

  const photosByArea = selected
    ? selected.photos.reduce<Record<string, typeof selected.photos>>((acc, p) => {
        (acc[p.areaLabel] ??= []).push(p);
        return acc;
      }, {})
    : {};

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-ink">Salon Audits</h2>
        <Button size="sm" onClick={handleStart} disabled={starting}>
          <Plus className="h-3.5 w-3.5" />
          {starting ? 'Starting...' : 'Start Audit'}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-ink-secondary">Loading...</p>
      ) : audits.length === 0 ? (
        <EmptyState title="No audits recorded for this salon yet" message="" icon={<Camera className="h-8 w-8" />} />
      ) : (
        <div className="divide-y divide-brand-50 mb-4">
          {audits.map((a) => (
            <button
              key={a.id}
              onClick={() => openAudit(a.id)}
              className={`w-full flex items-center justify-between gap-3 py-3 text-left hover:bg-brand-50/50 transition-colors px-2 rounded-lg ${selected?.id === a.id ? 'bg-brand-50/70' : ''}`}
            >
              <div>
                <p className="text-sm font-medium text-ink">{formatDate(a.auditDate)}</p>
                <p className="text-xs text-ink-secondary">{a.photoCount} photo(s)</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge bucket={lifecycleBucket[a.status]} label={a.status} size="sm" />
                {a.reviewStatus && <StatusBadge bucket={reviewBucket[a.reviewStatus]} label={a.reviewStatus} size="sm" />}
              </div>
            </button>
          ))}
        </div>
      )}

      {detailLoading && <p className="text-sm text-ink-secondary">Loading audit...</p>}

      {selected && !detailLoading && (
        <div className="rounded-xl border border-brand-100 p-5 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm font-semibold text-ink">Audit — {formatDate(selected.auditDate)}</p>
            <div className="flex items-center gap-2">
              <StatusBadge bucket={lifecycleBucket[selected.status]} label={selected.status} />
              {selected.reviewStatus && <StatusBadge bucket={reviewBucket[selected.reviewStatus]} label={selected.reviewStatus} />}
            </div>
          </div>

          {Object.keys(photosByArea).length === 0 ? (
            <p className="text-sm text-ink-secondary">No photos uploaded yet.</p>
          ) : (
            Object.entries(photosByArea).map(([area, photos]) => (
              <div key={area}>
                <p className="text-xs font-medium text-ink-secondary mb-2">{area}</p>
                <div className="flex flex-wrap gap-2">
                  {photos.map((p) => (
                    <span key={p.id} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 pl-2.5 pr-1.5 py-1.5 text-xs text-ink">
                      <Camera className="h-3 w-3" />
                      {p.fileName}
                      <button
                        type="button"
                        onClick={() => handleViewPhoto(p.id, p.fileName)}
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-brand-700 hover:bg-brand-100 transition-colors"
                        title="View photo"
                        aria-label={`View ${p.fileName}`}
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}

          {canUpload && (
            <div className="flex flex-col sm:flex-row gap-3 items-end pt-3 border-t border-brand-50">
              <Input
                label="Area label"
                placeholder="e.g. Entrance, Reception, Styling Bay 2..."
                value={areaLabel}
                onChange={(e) => setAreaLabel(e.target.value)}
                className="flex-1"
              />
              <label className="inline-flex">
                <input type="file" className="hidden" accept="image/*" disabled={!areaLabel.trim() || uploading} onChange={(e) => handleUpload(e.target.files?.[0] ?? null)} />
                <span
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 cursor-pointer transition-colors ${!areaLabel.trim() || uploading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <Upload className="h-4 w-4" />
                  {uploading ? 'Uploading...' : 'Upload Photo'}
                </span>
              </label>
            </div>
          )}

          {selected.status === 'IN_PROGRESS' && (isConductor || admin) && (
            <div className="pt-3 border-t border-brand-50">
              <Button onClick={handleSubmit} disabled={selected.photoCount === 0 || submitting} title={selected.photoCount === 0 ? 'Upload at least one photo before submitting' : undefined}>
                <Send className="h-4 w-4" />
                {submitting ? 'Submitting...' : 'Submit for Review'}
              </Button>
              {selected.photoCount === 0 && <p className="text-xs text-ink-secondary mt-1.5">Upload at least one photo before submitting.</p>}
            </div>
          )}

          {selected.status === 'SUBMITTED' && !canReview && (
            <p
              className="text-xs text-ink-secondary italic pt-3 border-t border-brand-50"
              title="You conducted this audit yourself - only Admin can review it"
            >
              {isConductor
                ? "You conducted this audit yourself — only Admin can review it."
                : 'Awaiting review by the assigned State Head or Admin.'}
            </p>
          )}

          {canReview && (
            <div className="flex gap-2 pt-3 border-t border-brand-50">
              <Button size="sm" onClick={() => setReviewModal('COMPLETE')}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark Complete
              </Button>
              <Button size="sm" variant="danger" onClick={() => setReviewModal('FLAGGED')}>
                <Flag className="h-3.5 w-3.5" />
                Flag
              </Button>
            </div>
          )}

          {selected.reviewNotes && (
            <p className="text-xs text-ink-secondary pt-3 border-t border-brand-50">Review notes: {selected.reviewNotes}</p>
          )}
        </div>
      )}

      <Modal
        open={!!reviewModal}
        onClose={() => {
          setReviewModal(null);
          setReviewNotes('');
        }}
        title={reviewModal === 'COMPLETE' ? 'Mark Audit Complete' : 'Flag Audit'}
        primaryLabel={reviewBusy ? 'Submitting...' : 'Confirm'}
        primaryVariant={reviewModal === 'FLAGGED' ? 'danger' : 'primary'}
        primaryDisabled={reviewBusy || (reviewModal === 'FLAGGED' && !reviewNotes.trim())}
        onPrimary={handleReview}
      >
        <Textarea
          label={reviewModal === 'FLAGGED' ? 'Notes (required)' : 'Notes (optional)'}
          rows={3}
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          error={reviewModal === 'FLAGGED' && !reviewNotes.trim() ? 'Notes are required when flagging an audit.' : undefined}
        />
      </Modal>

      {photoViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm animate-fade-in" onClick={closePhotoViewer} />
          <div className="relative max-w-3xl max-h-[85vh] w-full flex flex-col items-center animate-slide-up">
            <div className="w-full flex items-center justify-between mb-2 px-1">
              <p className="text-sm font-medium text-white truncate pr-3">{photoViewer.fileName}</p>
              <button
                onClick={closePhotoViewer}
                className="rounded-lg p-1.5 text-white hover:bg-white/10 transition-colors shrink-0"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden flex items-center justify-center w-full max-h-[75vh] min-h-[200px]">
              {photoViewer.error ? (
                <p className="text-sm text-red-600 p-6 text-center">{photoViewer.error}</p>
              ) : photoViewer.url ? (
                <img src={photoViewer.url} alt={photoViewer.fileName} className="max-w-full max-h-[75vh] object-contain" />
              ) : (
                <div className="flex items-center gap-2 text-ink-secondary p-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading photo...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
