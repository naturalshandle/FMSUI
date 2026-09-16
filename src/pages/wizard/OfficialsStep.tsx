import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { putOfficialsStep } from '@/lib/franchiseCreationApi';
import { listOfficials } from '@/lib/officialsApi';
import { ApiError } from '@/lib/api';
import type { FranchiseCreationDraft } from '@/types/wizard';
import type { Official } from '@/types';

const fields = [
  { key: 'clusterHeadOfficialId', label: 'Cluster Head', officialType: 'CLUSTER_MANAGER' },
  { key: 'regionalHeadOfficialId', label: 'Regional Head', officialType: 'REGIONAL_MANAGER' },
  { key: 'stateHeadOfficialId', label: 'State Head', officialType: 'STATE_HEAD' },
] as const;

interface Props {
  draft: FranchiseCreationDraft;
  onSaved: (updated: FranchiseCreationDraft, advance: boolean) => void;
}

export function OfficialsStep({ draft, onSaved }: Props) {
  const { showToast } = useToast();
  const [options, setOptions] = useState<Record<string, Official[]>>({});
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [form, setForm] = useState({
    clusterHeadOfficialId: draft.officialsData?.clusterHeadOfficialId ?? '',
    regionalHeadOfficialId: draft.officialsData?.regionalHeadOfficialId ?? '',
    stateHeadOfficialId: draft.officialsData?.stateHeadOfficialId ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all(fields.map((f) => listOfficials({ officialType: f.officialType, size: 200 })))
      .then((pages) => {
        const map: Record<string, Official[]> = {};
        fields.forEach((f, i) => {
          map[f.officialType] = pages[i].content;
        });
        setOptions(map);
      })
      .finally(() => setLoadingOptions(false));
  }, []);

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    fields.forEach((f) => {
      if (!form[f.key]) errs[f.key] = 'Required';
    });
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    try {
      const updated = await putOfficialsStep(draft.id, form);
      showToast('success', 'Officials saved.');
      onSaved(updated, true);
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to save officials.');
    } finally {
      setBusy(false);
    }
  };

  if (loadingOptions) {
    return <p className="text-sm text-ink-secondary">Loading officials...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map(({ key, label, officialType }) => (
          <div key={key}>
            <Select
              label={label}
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            >
              <option value="">Select {label.toLowerCase()}...</option>
              {(options[officialType] ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                  {o.region ? ` (${o.region})` : ''}
                </option>
              ))}
            </Select>
            {errors[key] && <p className="text-xs text-status-rejected mt-1">{errors[key]}</p>}
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-4 border-t border-brand-50">
        <Button onClick={handleSubmit} disabled={busy}>
          {busy ? 'Saving...' : 'Save & Continue'}
        </Button>
      </div>
    </div>
  );
}
