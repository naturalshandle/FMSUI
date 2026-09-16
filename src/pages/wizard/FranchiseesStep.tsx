import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { putFranchiseesStep } from '@/lib/franchiseCreationApi';
import { ApiError } from '@/lib/api';
import type { FranchiseCreationDraft, FranchiseeOwnerInput } from '@/types/wizard';

const PAN_PATTERN = /^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/;
const AADHAAR_PATTERN = /^\d{12}$/;

const emptyOwner: FranchiseeOwnerInput = { name: '', dob: '', pan: '', aadhaar: '', contact: '', address: '' };

interface Props {
  draft: FranchiseCreationDraft;
  onSaved: (updated: FranchiseCreationDraft, advance: boolean) => void;
}

export function FranchiseesStep({ draft, onSaved }: Props) {
  const { showToast } = useToast();
  // franchiseeOwners is null (not []) until this step has been saved at least once.
  const savedOwners = draft.franchiseeOwners ?? [];
  const [owners, setOwners] = useState<FranchiseeOwnerInput[]>(
    savedOwners.length > 0
      ? savedOwners.map((o) => ({ name: o.name, dob: o.dob, contact: o.contact, address: o.address, pan: '', aadhaar: '' }))
      : [{ ...emptyOwner }],
  );
  const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});
  const [busy, setBusy] = useState(false);

  const updateOwner = (i: number, patch: Partial<FranchiseeOwnerInput>) => {
    setOwners((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  };

  const addOwner = () => setOwners((prev) => [...prev, { ...emptyOwner }]);
  const removeOwner = (i: number) => setOwners((prev) => prev.filter((_, idx) => idx !== i));

  const validate = () => {
    const errs: Record<number, Record<string, string>> = {};
    owners.forEach((o, i) => {
      const e: Record<string, string> = {};
      if (!o.name.trim()) e.name = 'Required';
      if (!o.dob) e.dob = 'Required';
      if (!PAN_PATTERN.test(o.pan.trim())) e.pan = 'Format: ABCDE1234F';
      if (!AADHAAR_PATTERN.test(o.aadhaar.trim())) e.aadhaar = '12 digits';
      if (!o.contact.trim()) e.contact = 'Required';
      if (!o.address.trim()) e.address = 'Required';
      if (Object.keys(e).length > 0) errs[i] = e;
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      const updated = await putFranchiseesStep(
        draft.id,
        owners.map((o) => ({ ...o, pan: o.pan.trim().toUpperCase(), aadhaar: o.aadhaar.trim() })),
      );
      showToast('success', 'Franchisee(s) saved.');
      onSaved(updated, true);
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to save franchisee(s).');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {owners.map((owner, i) => (
        <div key={i} className="rounded-xl border border-brand-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Owner {i + 1}</h3>
            {owners.length > 1 && (
              <button onClick={() => removeOwner(i)} className="text-status-rejected hover:opacity-70" aria-label="Remove owner">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Name" value={owner.name} onChange={(e) => updateOwner(i, { name: e.target.value })} error={errors[i]?.name} />
            <Input
              label="Date of birth"
              type="date"
              value={owner.dob}
              onChange={(e) => updateOwner(i, { dob: e.target.value })}
              error={errors[i]?.dob}
            />
            <Input
              label="PAN"
              placeholder="ABCDE1234F"
              value={owner.pan}
              onChange={(e) => updateOwner(i, { pan: e.target.value.toUpperCase() })}
              error={errors[i]?.pan}
            />
            <Input
              label="Aadhaar"
              placeholder="123456789012"
              value={owner.aadhaar}
              onChange={(e) => updateOwner(i, { aadhaar: e.target.value.replace(/\D/g, '').slice(0, 12) })}
              error={errors[i]?.aadhaar}
            />
            <Input label="Contact" value={owner.contact} onChange={(e) => updateOwner(i, { contact: e.target.value })} error={errors[i]?.contact} />
            <Input label="Address" value={owner.address} onChange={(e) => updateOwner(i, { address: e.target.value })} error={errors[i]?.address} />
          </div>
        </div>
      ))}

      <Button variant="secondary" onClick={addOwner}>
        <Plus className="h-4 w-4" />
        Add another owner
      </Button>

      <div className="flex justify-end pt-4 border-t border-brand-50">
        <Button onClick={handleSubmit} disabled={busy}>
          {busy ? 'Saving...' : 'Save & Continue'}
        </Button>
      </div>
    </div>
  );
}
