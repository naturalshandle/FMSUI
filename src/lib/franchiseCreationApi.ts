import { request } from '@/lib/api';
import { uploadMultipart } from '@/lib/uploads';
import type {
  DraftAgreementData,
  DraftDocumentRecord,
  DraftFirmData,
  DraftOfficialsData,
  DraftSalonData,
  FinalizeResult,
  FranchiseCreationDraft,
  FranchiseeOwnerInput,
  WizardDocumentType,
} from '@/types/wizard';

/** Raw shape of a single entry in the backend's documentsData.documents map —
 * keyed by `${documentType}_${ownerIndex}` or `${documentType}`, not an array,
 * and using `filePath` rather than `fileName`. */
interface RawDraftDocument {
  documentType: WizardDocumentType;
  ownerIndex?: number;
  filePath?: string;
  fileName?: string;
  uploadedAt?: string;
}

interface RawFranchiseCreationDraft extends Omit<FranchiseCreationDraft, 'documentsData'> {
  documentsData: { documents: Record<string, RawDraftDocument> } | DraftDocumentRecord[] | null;
}

/** filePath looks like `.../storage/documents/{id}/{documentType}-{uuid}-{originalName}` —
 * strip the directory and the generated prefix to recover a display-friendly name. */
function deriveFileName(doc: RawDraftDocument): string | undefined {
  if (doc.fileName) return doc.fileName;
  if (!doc.filePath) return undefined;
  const base = doc.filePath.split(/[\\/]/).pop() ?? doc.filePath;
  const generatedPrefix = new RegExp(`^${doc.documentType}-[0-9a-fA-F-]{36}-`);
  return base.replace(generatedPrefix, '');
}

/** The backend returns documentsData as a keyed map ({ documents: { key: {...} } }),
 * not the array this frontend's types/UI expect — normalize on every read so
 * downstream code can keep treating documentsData as DraftDocumentRecord[]. */
function normalizeDraft(raw: RawFranchiseCreationDraft): FranchiseCreationDraft {
  const rawDocumentsData = raw.documentsData;
  const documentsData: DraftDocumentRecord[] | null = !rawDocumentsData
    ? null
    : Array.isArray(rawDocumentsData)
      ? rawDocumentsData
      : Object.values(rawDocumentsData.documents ?? {}).map((doc) => ({
          documentType: doc.documentType,
          ownerIndex: doc.ownerIndex,
          fileName: deriveFileName(doc),
          uploadedAt: doc.uploadedAt,
        }));

  return { ...raw, documentsData };
}

/** POST /api/v1/franchise-creation — no body. Creates a new draft at step 1. */
export async function createDraft(): Promise<FranchiseCreationDraft> {
  return normalizeDraft(await request<RawFranchiseCreationDraft>('/franchise-creation', { method: 'POST' }));
}

/** GET /api/v1/franchise-creation/{id} — resume. */
export async function getDraft(id: string): Promise<FranchiseCreationDraft> {
  return normalizeDraft(await request<RawFranchiseCreationDraft>(`/franchise-creation/${id}`));
}

/** GET /api/v1/franchise-creation — creator OR any assigned head; already
 * server-scoped, no extra client-side filtering needed. */
export async function listDrafts(): Promise<FranchiseCreationDraft[]> {
  const raw = await request<RawFranchiseCreationDraft[]>('/franchise-creation');
  return raw.map(normalizeDraft);
}

/**
 * DELETE /api/v1/franchise-creation/{id} — abandon. The backend allows calling
 * this unconditionally even on an already-FINALIZED draft — callers must hide or
 * disable this action client-side once status !== 'IN_PROGRESS' rather than
 * relying on the backend to refuse it.
 */
export async function abandonDraft(id: string): Promise<void> {
  await request(`/franchise-creation/${id}`, { method: 'DELETE' });
}

export async function putFranchiseesStep(id: string, owners: FranchiseeOwnerInput[]): Promise<FranchiseCreationDraft> {
  return normalizeDraft(
    await request<RawFranchiseCreationDraft>(`/franchise-creation/${id}/step/franchisees`, {
      method: 'PUT',
      body: { owners },
    }),
  );
}

export async function putFirmStep(id: string, firm: DraftFirmData): Promise<FranchiseCreationDraft> {
  return normalizeDraft(
    await request<RawFranchiseCreationDraft>(`/franchise-creation/${id}/step/firm`, { method: 'PUT', body: firm }),
  );
}

export async function putSalonStep(id: string, salon: DraftSalonData): Promise<FranchiseCreationDraft> {
  return normalizeDraft(
    await request<RawFranchiseCreationDraft>(`/franchise-creation/${id}/step/salon`, { method: 'PUT', body: salon }),
  );
}

export async function putOfficialsStep(id: string, officials: DraftOfficialsData): Promise<FranchiseCreationDraft> {
  return normalizeDraft(
    await request<RawFranchiseCreationDraft>(`/franchise-creation/${id}/step/officials`, {
      method: 'PUT',
      body: {
        clusterHeadOfficialId: Number(officials.clusterHeadOfficialId),
        regionalHeadOfficialId: Number(officials.regionalHeadOfficialId),
        stateHeadOfficialId: Number(officials.stateHeadOfficialId),
      },
    }),
  );
}

export async function putAgreementStep(id: string, agreement: DraftAgreementData): Promise<FranchiseCreationDraft> {
  return normalizeDraft(
    await request<RawFranchiseCreationDraft>(`/franchise-creation/${id}/step/agreement`, {
      method: 'PUT',
      body: agreement,
    }),
  );
}

/** POST .../step/documents — multipart. `ownerIndex` is required for PAN_PROOF and
 * AADHAAR_PROOF, omitted for GST_CERTIFICATE. Re-uploading the same
 * documentType+ownerIndex overwrites the prior file in that slot. */
export async function uploadStepDocument(
  id: string,
  documentType: WizardDocumentType,
  file: File,
  ownerIndex?: number,
): Promise<FranchiseCreationDraft> {
  const form = new FormData();
  form.append('documentType', documentType);
  if (ownerIndex !== undefined) form.append('ownerIndex', String(ownerIndex));
  form.append('file', file);
  return normalizeDraft(await uploadMultipart<RawFranchiseCreationDraft>(`/franchise-creation/${id}/step/documents`, form));
}

/** POST /api/v1/franchise-creation/{id}/finalize — creates the real
 * Franchisee/Firm/Salon/Officials/Agreement/Documents records. Irreversible. */
export async function finalizeDraft(id: string): Promise<FinalizeResult> {
  return request<FinalizeResult>(`/franchise-creation/${id}/finalize`, { method: 'POST' });
}
