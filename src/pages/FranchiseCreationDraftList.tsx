import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FilePlus2, ChevronRight, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge, type StatusBucket } from '@/components/ui/StatusBadge';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { listDrafts, abandonDraft } from '@/lib/franchiseCreationApi';
import { ApiError } from '@/lib/api';
import { WIZARD_STEPS } from '@/types/wizard';
import type { DraftStatus, FranchiseCreationDraft } from '@/types/wizard';

const draftStatusBucket: Record<DraftStatus, StatusBucket> = {
  IN_PROGRESS: 'neutral',
  FINALIZED: 'positive',
  ABANDONED: 'closed',
};

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function FranchiseCreationDraftList() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [drafts, setDrafts] = useState<FranchiseCreationDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abandonTarget, setAbandonTarget] = useState<FranchiseCreationDraft | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    listDrafts()
      .then(setDrafts)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load drafts.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleAbandon = async () => {
    if (!abandonTarget) return;
    setBusy(true);
    try {
      await abandonDraft(abandonTarget.id);
      showToast('success', 'Draft abandoned.');
      setAbandonTarget(null);
      load();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to abandon draft.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Franchise Creation Drafts</h1>
          <p className="text-sm text-ink-secondary mt-1">Drafts you created, or where you're an assigned head</p>
        </div>
        <Button onClick={() => navigate('/franchise-creation/new')}>
          <Plus className="h-4 w-4" />
          New Draft
        </Button>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <SkeletonTable rows={4} />
        ) : error ? (
          <EmptyState title="Couldn't load drafts" message={error} icon={<FilePlus2 className="h-8 w-8" />} />
        ) : drafts.length === 0 ? (
          <EmptyState
            title="No franchise creation drafts yet"
            message="Start a new one to onboard a franchise end-to-end."
            icon={<FilePlus2 className="h-8 w-8" />}
            action={<Button onClick={() => navigate('/franchise-creation/new')}>New Draft</Button>}
          />
        ) : (
          <div className="divide-y divide-brand-50">
            {drafts.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-brand-50/50 transition-colors">
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => d.status === 'IN_PROGRESS' && navigate(`/franchise-creation/${d.id}`)}
                >
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <p className="text-sm font-medium text-ink">Draft #{d.id}</p>
                    <StatusBadge bucket={draftStatusBucket[d.status]} label={d.status.replace('_', ' ')} />
                    {d.status === 'IN_PROGRESS' && (
                      <span className="text-xs text-ink-secondary">
                        Step {d.currentStep} of {WIZARD_STEPS.length}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-secondary mt-1">Created {formatDate(d.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {d.status === 'IN_PROGRESS' && (
                    <Button size="sm" variant="danger" onClick={() => setAbandonTarget(d)}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Abandon
                    </Button>
                  )}
                  <ChevronRight className="h-4 w-4 text-ink-secondary/30" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={!!abandonTarget}
        onClose={() => setAbandonTarget(null)}
        title="Abandon this draft?"
        description="This cannot be undone."
        primaryLabel={busy ? 'Abandoning...' : 'Abandon'}
        primaryVariant="danger"
        primaryDisabled={busy}
        onPrimary={handleAbandon}
      >
        <div />
      </Modal>
    </div>
  );
}
