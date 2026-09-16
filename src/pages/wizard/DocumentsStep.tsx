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

/** Client-side courtesy allow-list only — the backend performs no content-type or
 * size validation on this endpoint (a known, accepted gap, not fixed by this UI). */
const ACCEPT = '.pdf,.jpg,.jpeg,.png';
const MAX_BYTES = 10 * 1024 * 1024;

export function DocumentsStep({ draft, onSaved, onReview }: Props) {
  const { showToast } = useToast();
  const [uploading, setUploading] = useState<string | null>(null);
  // franchiseeOwners is null (not []) until the franchisees step has been saved.
  const owners = draft.franchiseeOwners ?? [];

  const existingFileName = (documentType: WizardDocumentType, ownerIndex?: number) =>
    draft.documentsData?.find((d) => d.documentType === documentType && d.ownerIndex === ownerIndex)?.fileName;

  const handleUpload = async (documentType: WizardDocumentType, file: File | null, ownerIndex?: number) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      showToast('error', 'File is larger than 10MB — this is a UX courtesy limit, please choose a smaller file.');
      return;
    }
    const slotKey = `${documentType}:${ownerIndex ?? ''}`;
    setUploading(slotKey);
    try {
      const updated = await uploadStepDocument(draft.id, documentType, file, ownerIndex);
      showToast('success', 'Document uploaded.');
      onSaved(updated, false);
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to upload document.');
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
            onFileSelected={(file) => handleUpload('PAN_PROOF', file, i)}
          />
          <FileUpload
            label={
              existingFileName('AADHAAR_PROOF', i) ? `Replace Aadhaar proof (current: ${existingFileName('AADHAAR_PROOF', i)})` : 'Aadhaar Proof'
            }
            optional={i !== 0}
            accept={ACCEPT}
            uploading={uploading === `AADHAAR_PROOF:${i}`}
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
