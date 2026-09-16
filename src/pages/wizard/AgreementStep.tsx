import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { putAgreementStep } from '@/lib/franchiseCreationApi';
import { ApiError } from '@/lib/api';
import type { FranchiseCreationDraft } from '@/types/wizard';

interface Props {
  draft: FranchiseCreationDraft;
  onSaved: (updated: FranchiseCreationDraft, advance: boolean) => void;
}

export function AgreementStep({ draft, onSaved }: Props) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    validFrom: draft.agreementData?.validFrom ?? '',
    validTill: draft.agreementData?.validTill ?? '',
    royaltyTerms: draft.agreementData?.royaltyTerms ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!form.validFrom) errs.validFrom = 'Required';
    if (!form.validTill) errs.validTill = 'Required';
    if (!form.royaltyTerms.trim()) errs.royaltyTerms = 'Required';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    try {
      const updated = await putAgreementStep(draft.id, form);
      showToast('success', 'Agreement saved.');
      onSaved(updated, true);
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to save agreement.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Valid From"
          type="date"
          value={form.validFrom}
          onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
          error={errors.validFrom}
        />
        <Input
          label="Valid Till"
          type="date"
          value={form.validTill}
          onChange={(e) => setForm((f) => ({ ...f, validTill: e.target.value }))}
          error={errors.validTill}
        />
      </div>
      <Textarea
        label="Royalty Terms"
        rows={4}
        value={form.royaltyTerms}
        onChange={(e) => setForm((f) => ({ ...f, royaltyTerms: e.target.value }))}
        error={errors.royaltyTerms}
      />

      <div className="flex justify-end pt-4 border-t border-brand-50">
        <Button onClick={handleSubmit} disabled={busy}>
          {busy ? 'Saving...' : 'Save & Continue'}
        </Button>
      </div>
    </div>
  );
}
