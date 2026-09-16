import { useState } from 'react';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { finalizeDraft } from '@/lib/franchiseCreationApi';
import { ApiError } from '@/lib/api';
import { WIZARD_STEPS, type FranchiseCreationDraft } from '@/types/wizard';
import type { FinalizeResult } from '@/types/wizard';

interface Props {
  draft: FranchiseCreationDraft;
  onBack: () => void;
  onEditStep: (stepIndex: number) => void;
  onFinalized: (result: FinalizeResult) => void;
}

/** Parses "Cannot finalize - incomplete sections: {section}: {message}; ..." into
 * a per-section list rather than showing the raw string, per spec §3. */
function parseIncompleteSections(message: string): { section: string; message: string }[] | null {
  const prefix = 'Cannot finalize - incomplete sections: ';
  if (!message.startsWith(prefix)) return null;
  const rest = message.slice(prefix.length);
  return rest
    .split('; ')
    .map((entry) => {
      const idx = entry.indexOf(': ');
      if (idx === -1) return { section: entry, message: '' };
      return { section: entry.slice(0, idx), message: entry.slice(idx + 2) };
    })
    .filter((e) => e.section);
}

export function FinalizeReview({ draft, onBack, onEditStep, onFinalized }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incomplete, setIncomplete] = useState<{ section: string; message: string }[] | null>(null);

  const handleFinalize = async () => {
    setBusy(true);
    setError(null);
    setIncomplete(null);
    try {
      const result = await finalizeDraft(draft.id);
      onFinalized(result);
    } catch (err) {
      if (err instanceof ApiError) {
        const parsed = parseIncompleteSections(err.message);
        if (parsed) {
          setIncomplete(parsed);
          setConfirmOpen(false);
        } else if (err.status === 409) {
          setError(err.message);
          setConfirmOpen(false);
        } else {
          setError(err.message);
          setConfirmOpen(false);
        }
      } else {
        setError('Failed to finalize.');
        setConfirmOpen(false);
      }
    } finally {
      setBusy(false);
    }
  };

  const sectionStepIndex = (section: string): number => {
    const normalized = section.toLowerCase();
    const idx = WIZARD_STEPS.findIndex((s) => normalized.includes(s));
    return idx === -1 ? 0 : idx;
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-brand-700 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to wizard
      </button>

      <h1 className="text-2xl font-bold text-ink">Review &amp; Finalize</h1>
      <p className="text-sm text-ink-secondary">
        Review everything below before finalizing — this creates the real Franchisee, Firm, Salon, and Agreement
        records and cannot be undone.
      </p>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-status-rejected">{error}</div>
      )}

      {incomplete && (
        <Card className="p-5 border-red-200">
          <div className="flex items-center gap-2 mb-3 text-status-rejected">
            <AlertTriangle className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Incomplete sections</h3>
          </div>
          <ul className="space-y-2">
            {incomplete.map((item, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  <span className="font-medium text-ink">{item.section}</span>
                  {item.message && <span className="text-ink-secondary"> — {item.message}</span>}
                </span>
                <Button size="sm" variant="secondary" onClick={() => onEditStep(sectionStepIndex(item.section))}>
                  Fix
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-6 space-y-5">
        <ReviewSection title="Franchisee(s)" onEdit={() => onEditStep(0)}>
          {/* franchiseeOwners is null (not []) until this step has been saved. */}
          {(draft.franchiseeOwners ?? []).length === 0 ? (
            <p className="text-sm text-ink-secondary">Not completed.</p>
          ) : (
            (draft.franchiseeOwners ?? []).map((o, i) => (
              <p key={i} className="text-sm text-ink">
                {o.name} — {o.contact} {o.panProvided ? '· PAN on file' : '· PAN missing'}{' '}
                {o.aadhaarProvided ? '· Aadhaar on file' : '· Aadhaar missing'}
              </p>
            ))
          )}
        </ReviewSection>

        <ReviewSection title="Firm" onEdit={() => onEditStep(1)}>
          {draft.firmData ? (
            <p className="text-sm text-ink">
              {draft.firmData.legalName} · {draft.firmData.companyType} · GST {draft.firmData.gstNumber}
            </p>
          ) : (
            <p className="text-sm text-ink-secondary">Not completed.</p>
          )}
        </ReviewSection>

        <ReviewSection title="Salon" onEdit={() => onEditStep(2)}>
          {draft.salonData ? (
            <p className="text-sm text-ink">
              {draft.salonData.name} ({draft.salonData.code}) · {draft.salonData.district}, {draft.salonData.state}
            </p>
          ) : (
            <p className="text-sm text-ink-secondary">Not completed.</p>
          )}
        </ReviewSection>

        <ReviewSection title="Officials" onEdit={() => onEditStep(3)}>
          {draft.officialsData ? (
            <p className="text-sm text-ink">
              Cluster #{draft.officialsData.clusterHeadOfficialId} · Regional #{draft.officialsData.regionalHeadOfficialId} · State #
              {draft.officialsData.stateHeadOfficialId}
            </p>
          ) : (
            <p className="text-sm text-ink-secondary">Not completed.</p>
          )}
        </ReviewSection>

        <ReviewSection title="Agreement" onEdit={() => onEditStep(4)}>
          {draft.agreementData ? (
            <p className="text-sm text-ink">
              {draft.agreementData.validFrom} to {draft.agreementData.validTill}
            </p>
          ) : (
            <p className="text-sm text-ink-secondary">Not completed.</p>
          )}
        </ReviewSection>

        <ReviewSection title="Documents" onEdit={() => onEditStep(5)}>
          <p className="text-sm text-ink">
            {draft.allRequiredDocumentsPresent ? 'All required documents uploaded.' : 'Required documents missing.'}
          </p>
        </ReviewSection>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => setConfirmOpen(true)} disabled={busy}>
          Finalize
        </Button>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Finalize this franchise?"
        description="This creates real Franchisee, Firm, Salon, Officials, Agreement, and Document records. This cannot be undone."
        primaryLabel={busy ? 'Finalizing...' : 'Finalize'}
        primaryVariant="danger"
        primaryDisabled={busy}
        onPrimary={handleFinalize}
      >
        <p className="text-sm text-ink-secondary">Double-check everything above before continuing.</p>
      </Modal>
    </div>
  );
}

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="pb-5 border-b border-brand-50 last:border-0 last:pb-0">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <button onClick={onEdit} className="text-xs font-medium text-brand-700 hover:text-brand-800">
          Edit
        </button>
      </div>
      {children}
    </div>
  );
}
