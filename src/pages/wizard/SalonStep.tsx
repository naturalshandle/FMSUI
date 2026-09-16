import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { putSalonStep } from '@/lib/franchiseCreationApi';
import { ApiError } from '@/lib/api';
import type { DraftSalonData, FranchiseCreationDraft } from '@/types/wizard';

const emptyForm: DraftSalonData = {
  code: '',
  laSalonCode: '',
  name: '',
  format: '',
  sqFt: 0,
  launchDate: '',
  address: '',
  district: '',
  state: '',
  pincode: '',
  primaryContact: '',
  ratecard: '',
};

interface Props {
  draft: FranchiseCreationDraft;
  onSaved: (updated: FranchiseCreationDraft, advance: boolean) => void;
}

export function SalonStep({ draft, onSaved }: Props) {
  const { showToast } = useToast();
  const [form, setForm] = useState<DraftSalonData>(draft.salonData ?? emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const set = (patch: Partial<DraftSalonData>) => setForm((f) => ({ ...f, ...patch }));

  const requiredFields: (keyof DraftSalonData)[] = [
    'code',
    'laSalonCode',
    'name',
    'format',
    'launchDate',
    'address',
    'district',
    'state',
    'pincode',
    'primaryContact',
  ];

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    requiredFields.forEach((f) => {
      if (!String(form[f] ?? '').trim()) errs[f] = 'Required';
    });
    if (!form.sqFt || form.sqFt <= 0) errs.sqFt = 'sqFt is required';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    try {
      const updated = await putSalonStep(draft.id, form);
      showToast('success', 'Salon saved.');
      onSaved(updated, true);
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to save salon.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Salon Code" value={form.code} onChange={(e) => set({ code: e.target.value })} error={errors.code} />
        <Input label="LA Salon Code" value={form.laSalonCode} onChange={(e) => set({ laSalonCode: e.target.value })} error={errors.laSalonCode} />
        <Input label="Name" value={form.name} onChange={(e) => set({ name: e.target.value })} error={errors.name} />
        <Input label="Format" placeholder="UNISEX / LADIES / GENTS" value={form.format} onChange={(e) => set({ format: e.target.value })} error={errors.format} />
        <Input
          label="Square Footage"
          type="number"
          value={form.sqFt || ''}
          onChange={(e) => set({ sqFt: Number(e.target.value) })}
          error={errors.sqFt}
        />
        <Input label="Launch Date" type="date" value={form.launchDate} onChange={(e) => set({ launchDate: e.target.value })} error={errors.launchDate} />
        <Input label="District" value={form.district} onChange={(e) => set({ district: e.target.value })} error={errors.district} />
        <Input label="State" value={form.state} onChange={(e) => set({ state: e.target.value })} error={errors.state} />
        <Input label="Pincode" value={form.pincode} onChange={(e) => set({ pincode: e.target.value })} error={errors.pincode} />
        <Input label="Primary Contact" value={form.primaryContact} onChange={(e) => set({ primaryContact: e.target.value })} error={errors.primaryContact} />
      </div>
      <Textarea label="Address" rows={2} value={form.address} onChange={(e) => set({ address: e.target.value })} error={errors.address} />
      <Textarea label="Ratecard" rows={2} value={form.ratecard} onChange={(e) => set({ ratecard: e.target.value })} />

      <div className="flex justify-end pt-4 border-t border-brand-50">
        <Button onClick={handleSubmit} disabled={busy}>
          {busy ? 'Saving...' : 'Save & Continue'}
        </Button>
      </div>
    </div>
  );
}
