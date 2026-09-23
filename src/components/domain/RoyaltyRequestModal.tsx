import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api';
import {
  ROYALTY_TYPES,
  formatRoyaltyType,
  formatRoyaltyValue,
  royaltyTypeLabels,
  royaltyValueLabel,
  royaltyValueSuffix,
  submitRoyaltyRequest,
  validateRoyaltyValue,
} from '@/lib/royaltyApi';
import type { RoyaltyRequest, RoyaltyType } from '@/types';

interface RoyaltyRequestModalProps {
  open: boolean;
  onClose: () => void;
  salonId: string;
  salonName: string;
  /** Live terms, shown read-only for context; null when none are recorded yet. */
  currentValue: number | null;
  currentType: RoyaltyType | null;
  /** True when the submitter is the salon's State Head (their step is skipped). */
  submitterIsStateHead: boolean;
  onSubmitted: (created: RoyaltyRequest) => void;
}

const EMPTY = { value: '', type: '' as RoyaltyType | '', reason: '', instructedBy: '' };

export function RoyaltyRequestModal({
  open,
  onClose,
  salonId,
  salonName,
  currentValue,
  currentType,
  submitterIsStateHead,
  onSubmitted,
}: RoyaltyRequestModalProps) {
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const valueError = validateRoyaltyValue(form.value, form.type);
  // Don't flag an untouched field, but do flag a bad value as soon as one exists.
  const shownValueError = form.value.trim() && valueError ? valueError : undefined;
  const canSubmit = !valueError && !!form.reason.trim() && !busy;

  const close = () => {
    setForm(EMPTY);
    onClose();
  };

  const submit = async () => {
    if (!canSubmit || !form.type) return;
    setBusy(true);
    try {
      const created = await submitRoyaltyRequest(salonId, {
        newValue: Number(form.value),
        newRoyaltyType: form.type,
        reason: form.reason.trim(),
        instructedBy: form.instructedBy.trim() || null,
      });
      showToast(
        'success',
        created.skippedStateHeadStep
          ? 'Submitted. As the assigned State Head, this skips the recommendation step and goes directly to Admin.'
          : 'Royalty change request submitted. It now awaits the State Head.',
      );
      setForm(EMPTY);
      onSubmitted(created);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        showToast('error', "You aren't the assigned Regional Manager, Cluster Manager, or State Head for this salon.");
      } else {
        showToast('error', err instanceof ApiError ? err.message : 'Failed to submit royalty change request.');
      }
    } finally {
      setBusy(false);
    }
  };

  const isPercent = form.type === 'VARIABLE';

  return (
    <Modal
      open={open}
      onClose={close}
      title="Request Royalty Change"
      description={
        submitterIsStateHead
          ? `Submit a royalty change for ${salonName}. As the assigned State Head, it goes straight to Admin.`
          : `Submit a royalty change for ${salonName}. The State Head recommends first, then Admin decides.`
      }
      primaryLabel={busy ? 'Submitting...' : 'Submit Request'}
      primaryDisabled={!canSubmit}
      onPrimary={submit}
    >
      <div className="space-y-4">
        <Input
          label="Current royalty"
          value={
            currentValue == null
              ? '—'
              : `${formatRoyaltyValue(currentValue, currentType)}${currentType ? ` · ${formatRoyaltyType(currentType)}` : ''}`
          }
          disabled
          className="opacity-60"
        />
        <Select
          label="New royalty type"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as RoyaltyType | '' })}
        >
          <option value="">Select a type...</option>
          {ROYALTY_TYPES.map((t) => (
            <option key={t} value={t}>
              {royaltyTypeLabels[t]}
            </option>
          ))}
        </Select>
        <Input
          label={royaltyValueLabel(form.type)}
          type="number"
          inputMode="decimal"
          min={isPercent ? 0 : undefined}
          max={isPercent ? 100 : undefined}
          step="any"
          suffix={royaltyValueSuffix(form.type)}
          placeholder={isPercent ? 'E.g. 7.5' : form.type ? 'E.g. 25000' : 'Select a type first'}
          disabled={!form.type}
          value={form.value}
          onChange={(e) => setForm({ ...form, value: e.target.value })}
          error={shownValueError}
        />
        <Textarea
          label="Reason"
          placeholder="Reason for this royalty change..."
          rows={3}
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          error={open && !form.reason.trim() && form.value.trim() ? 'A reason is required.' : undefined}
        />
        <Input
          label="Instructed by (optional)"
          placeholder="E.g. Regional Director"
          value={form.instructedBy}
          onChange={(e) => setForm({ ...form, instructedBy: e.target.value })}
        />
      </div>
    </Modal>
  );
}
