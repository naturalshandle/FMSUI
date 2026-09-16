import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { putFirmStep } from '@/lib/franchiseCreationApi';
import { ApiError } from '@/lib/api';
import type { FranchiseCreationDraft } from '@/types/wizard';

const knownCompanyTypes = ['PROPRIETORSHIP', 'PARTNERSHIP', 'PRIVATE_LIMITED', 'LLP'];

interface Props {
  draft: FranchiseCreationDraft;
  onSaved: (updated: FranchiseCreationDraft, advance: boolean) => void;
}

export function FirmStep({ draft, onSaved }: Props) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    legalName: draft.firmData?.legalName ?? '',
    companyType: draft.firmData?.companyType ?? '',
    gstNumber: draft.firmData?.gstNumber ?? '',
    fpCode: draft.firmData?.fpCode ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!form.legalName.trim()) errs.legalName = 'Required';
    if (!form.companyType) errs.companyType = 'Required';
    if (!form.gstNumber.trim()) errs.gstNumber = 'Required';
    if (!form.fpCode.trim()) errs.fpCode = 'Required';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    try {
      const updated = await putFirmStep(draft.id, form);
      showToast('success', 'Firm saved.');
      onSaved(updated, true);
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to save firm.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Legal Name"
          value={form.legalName}
          onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
          error={errors.legalName}
        />
        <Select
          label="Company Type"
          value={form.companyType}
          onChange={(e) => setForm((f) => ({ ...f, companyType: e.target.value }))}
        >
          <option value="">Select...</option>
          {knownCompanyTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        {errors.companyType && <p className="text-xs text-status-rejected -mt-2">{errors.companyType}</p>}
        <Input
          label="GST Number"
          value={form.gstNumber}
          onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value }))}
          error={errors.gstNumber}
        />
        <Input label="FP Code" value={form.fpCode} onChange={(e) => setForm((f) => ({ ...f, fpCode: e.target.value }))} error={errors.fpCode} />
      </div>

      <div className="flex justify-end pt-4 border-t border-brand-50">
        <Button onClick={handleSubmit} disabled={busy}>
          {busy ? 'Saving...' : 'Save & Continue'}
        </Button>
      </div>
    </div>
  );
}
