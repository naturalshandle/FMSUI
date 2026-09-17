import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FileUpload } from '@/components/ui/FileUpload';
import { useToast } from '@/components/ui/Toast';
import { uploadStepDocument } from '@/lib/franchiseCreationApi';
import { ApiError } from '@/lib/api';
import type { FranchiseCreationDraft, WizardDocumentType } from '@/types/wizard';

interface Props {
  draft: FranchiseCreationDraft;
  onSaved: (updated: FranchiseCreationDraft, advance: boolean) => void;
  onReview: (updated: FranchiseCreationDraft) => void;
}

/** Client-side courtesy allow-list only — the backend performs no content-type
 * validation on this endpoint (a known, accepted gap, not fixed by this UI). Size
 * IS enforced server-side by DocumentStorageService, so MAX_BYTES here mirrors that
 * limit as a UX courtesy — the backend response is still the source of truth. */
const ACCEPT = '.pdf,.jpg,.jpeg,.png';
const MAX_BYTES = 10 * 1024 * 1024;
const FILE_SIZE_ERROR_MESSAGE = 'File exceeds the maximum allowed size of 10MB. Please choose a smaller file.';

/** Shared client-side size check, reused across all document upload rows. */
function validateFileSize(file: File): string | null {
  return file.size > MAX_BYTES ? FILE_SIZE_ERROR_MESSAGE : null;
}

export function DocumentsStep({ draft, onSaved, onReview }: Props) {
  const { showToast } = useToast();
  const [uploading, setUploading] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  // franchiseeOwners is null (not []) until the franchisees step has been saved.
  const owners = draft.franchiseeOwners ?? [];

  const existingFileName = (documentType: WizardDocumentType, ownerIndex?: number) =>
    draft.documentsData?.find((d) => d.documentType === documentType && d.ownerIndex === ownerIndex)?.fileName;

  const handleUpload = async (documentType: WizardDocumentType, file: File | null, ownerIndex?: number) => {
    const slotKey = `${documentType}:${ownerIndex ?? ''}`;
    if (!file) {
      setErrors((prev) => ({ ...prev, [slotKey]: undefined }));
      return;
    }

    const sizeError = validateFileSize(file);
    if (sizeError) {
      setErrors((prev) => ({ ...prev, [slotKey]: sizeError }));
      return;
    }

    setErrors((prev) => ({ ...prev, [slotKey]: undefined }));
    setUploading(slotKey);
    try {
      const updated = await uploadStepDocument(draft.id, documentType, file, ownerIndex);
      showToast('success', 'Document uploaded.');
      onSaved(updated, false);
    } catch (err) {
      const isServerSideSizeError = err instanceof ApiError && err.status === 400 && /exceeds the maximum allowed size/i.test(err.message);
      const message = isServerSideSizeError ? FILE_SIZE_ERROR_MESSAGE : err instanceof ApiError ? err.message : 'Failed to upload document.';
      setErrors((prev) => ({ ...prev, [slotKey]: message }));
      showToast('error', message);
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        File type/size checks here are a UX courtesy only — not a security control. Only GST Certificate and Owner
        1's PAN &amp; Aadhaar proofs are required to finalize; other owners' documents are optional.
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-ink">GST Certificate (required)</h3>
        <FileUpload
          label={existingFileName('GST_CERTIFICATE') ? `Replace file (current: ${existingFileName('GST_CERTIFICATE')})` : 'GST Certificate'}
          accept={ACCEPT}
          uploading={uploading === 'GST_CERTIFICATE:'}
          error={errors['GST_CERTIFICATE:']}
          onFileSelected={(file) => handleUpload('GST_CERTIFICATE', file)}
        />
      </div>

      {owners.length === 0 && (
        <p className="text-sm text-ink-secondary">Complete the Franchisee(s) step first to upload owner documents.</p>
      )}

      {owners.map((_, i) => (
        <div key={i} className="space-y-4 rounded-xl border border-brand-100 p-5">
          <h3 className="text-sm font-semibold text-ink">
            Owner {i + 1} documents {i === 0 ? '(required)' : '(optional)'}
          </h3>
          <FileUpload
            label={existingFileName('PAN_PROOF', i) ? `Replace PAN proof (current: ${existingFileName('PAN_PROOF', i)})` : 'PAN Proof'}
            optional={i !== 0}
            accept={ACCEPT}
            uploading={uploading === `PAN_PROOF:${i}`}
            error={errors[`PAN_PROOF:${i}`]}
            onFileSelected={(file) => handleUpload('PAN_PROOF', file, i)}
          />
          <FileUpload
            label={
              existingFileName('AADHAAR_PROOF', i) ? `Replace Aadhaar proof (current: ${existingFileName('AADHAAR_PROOF', i)})` : 'Aadhaar Proof'
            }
            optional={i !== 0}
            accept={ACCEPT}
            uploading={uploading === `AADHAAR_PROOF:${i}`}
            error={errors[`AADHAAR_PROOF:${i}`]}
            onFileSelected={(file) => handleUpload('AADHAAR_PROOF', file, i)}
          />
        </div>
      ))}

      <div className="flex justify-end pt-4 border-t border-brand-50">
        <Button
          onClick={() => onReview(draft)}
          disabled={!draft.allRequiredDocumentsPresent}
          title={!draft.allRequiredDocumentsPresent ? 'Upload the required documents first' : undefined}
        >
          Continue to Review
        </Button>
      </div>
    </div>
  );
}
