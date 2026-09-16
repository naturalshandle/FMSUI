import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Lock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { createDraft, getDraft } from '@/lib/franchiseCreationApi';
import { ApiError } from '@/lib/api';
import { WIZARD_STEPS, WIZARD_STEP_LABELS, type FranchiseCreationDraft, type WizardStepName } from '@/types/wizard';
import { FranchiseesStep } from '@/pages/wizard/FranchiseesStep';
import { FirmStep } from '@/pages/wizard/FirmStep';
import { SalonStep } from '@/pages/wizard/SalonStep';
import { OfficialsStep } from '@/pages/wizard/OfficialsStep';
import { AgreementStep } from '@/pages/wizard/AgreementStep';
import { DocumentsStep } from '@/pages/wizard/DocumentsStep';
import { FinalizeReview } from '@/pages/wizard/FinalizeReview';

export function FranchiseCreationWizard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [draft, setDraft] = useState<FranchiseCreationDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      createDraft()
        .then((created) => {
          if (cancelled) return;
          navigate(`/franchise-creation/${created.id}`, { replace: true });
        })
        .catch((err) => {
          if (cancelled) return;
          setLoadError(err instanceof ApiError ? err.message : 'Failed to start a new draft.');
          setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }
    getDraft(id)
      .then((d) => {
        if (cancelled) return;
        setDraft(d);
        // currentStep is a 1-indexed high-water mark; land on it (capped at the last step).
        setActiveStepIndex(Math.min(d.currentStep, WIZARD_STEPS.length) - 1);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : 'Failed to load this draft.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const handleStepSaved = useCallback((updated: FranchiseCreationDraft, advance: boolean) => {
    setDraft(updated);
    if (advance) {
      setActiveStepIndex((i) => Math.min(i + 1, WIZARD_STEPS.length - 1));
    }
  }, []);

  const goToReview = useCallback((updated: FranchiseCreationDraft) => {
    setDraft(updated);
    setReviewing(true);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card className="p-6">
          <Skeleton className="h-10 w-full mb-6" />
          <Skeleton className="h-64 w-full" />
        </Card>
      </div>
    );
  }

  if (loadError || !draft) {
    return (
      <EmptyState
        title="Couldn't load this draft"
        message={loadError ?? 'This draft may have been abandoned or finalized.'}
        action={<Button onClick={() => navigate('/franchise-creation')}>Back to Drafts</Button>}
      />
    );
  }

  if (draft.status !== 'IN_PROGRESS') {
    return (
      <EmptyState
        title={`This draft is ${draft.status.toLowerCase().replace('_', ' ')}`}
        message="It can no longer be edited."
        action={<Button onClick={() => navigate('/franchise-creation')}>Back to Drafts</Button>}
      />
    );
  }

  if (reviewing) {
    return (
      <FinalizeReview
        draft={draft}
        onBack={() => setReviewing(false)}
        onEditStep={(stepIndex) => {
          setReviewing(false);
          setActiveStepIndex(stepIndex);
        }}
        onFinalized={(result) => {
          showToast('success', 'Franchise created!');
          navigate(`/franchisee/${result.franchiseeIds[0]}`);
        }}
      />
    );
  }

  const highWaterIndex = draft.currentStep - 1; // 0-indexed
  const activeStep: WizardStepName = WIZARD_STEPS[activeStepIndex];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">New Franchise</h1>
        <p className="text-sm text-ink-secondary mt-1">Draft #{draft.id}</p>
      </div>

      {/* Step indicator */}
      <div className="flex flex-wrap gap-2">
        {WIZARD_STEPS.map((step, i) => {
          const completed = i <= highWaterIndex;
          const locked = i > highWaterIndex;
          const current = i === activeStepIndex;
          return (
            <button
              key={step}
              disabled={locked}
              title={locked ? 'Complete previous steps first' : undefined}
              onClick={() => !locked && setActiveStepIndex(i)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all ${
                current
                  ? 'bg-gradient-to-r from-brand-600 to-brand-400 text-white shadow-card'
                  : locked
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-ink-secondary border border-brand-100 hover:border-brand-300 hover:text-brand-700'
              }`}
            >
              {completed && !current ? <Check className="h-4 w-4" /> : locked ? <Lock className="h-3.5 w-3.5" /> : null}
              {i + 1}. {WIZARD_STEP_LABELS[step]}
            </button>
          );
        })}
        <button
          disabled={highWaterIndex < WIZARD_STEPS.length - 1}
          onClick={() => setReviewing(true)}
          title={highWaterIndex < WIZARD_STEPS.length - 1 ? 'Complete all steps first' : undefined}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all ${
            highWaterIndex >= WIZARD_STEPS.length - 1
              ? 'bg-white text-brand-700 border border-brand-300 hover:bg-brand-50'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          Review &amp; Finalize
        </button>
      </div>

      <Card className="p-6">
        {activeStep === 'franchisees' && <FranchiseesStep draft={draft} onSaved={handleStepSaved} />}
        {activeStep === 'firm' && <FirmStep draft={draft} onSaved={handleStepSaved} />}
        {activeStep === 'salon' && <SalonStep draft={draft} onSaved={handleStepSaved} />}
        {activeStep === 'officials' && <OfficialsStep draft={draft} onSaved={handleStepSaved} />}
        {activeStep === 'agreement' && <AgreementStep draft={draft} onSaved={handleStepSaved} />}
        {activeStep === 'documents' && <DocumentsStep draft={draft} onSaved={handleStepSaved} onReview={goToReview} />}
      </Card>
    </div>
  );
}
