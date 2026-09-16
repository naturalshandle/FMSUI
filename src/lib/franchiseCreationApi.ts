import { request } from '@/lib/api';
import { uploadMultipart } from '@/lib/uploads';
import type {
  DraftAgreementData,
  DraftFirmData,
  DraftOfficialsData,
  DraftSalonData,
  FinalizeResult,
  FranchiseCreationDraft,
  FranchiseeOwnerInput,
  WizardDocumentType,
} from '@/types/wizard';

/** POST /api/v1/franchise-creation — no body. Creates a new draft at step 1. */
export async function createDraft(): Promise<FranchiseCreationDraft> {
  return request<FranchiseCreationDraft>('/franchise-creation', { method: 'POST' });
}

/** GET /api/v1/franchise-creation/{id} — resume. */
export async function getDraft(id: string): Promise<FranchiseCreationDraft> {
  return request<FranchiseCreationDraft>(`/franchise-creation/${id}`);
}

/** GET /api/v1/franchise-creation — creator OR any assigned head; already
 * server-scoped, no extra client-side filtering needed. */
export async function listDrafts(): Promise<FranchiseCreationDraft[]> {
  return request<FranchiseCreationDraft[]>('/franchise-creation');
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
  return request<FranchiseCreationDraft>(`/franchise-creation/${id}/step/franchisees`, {
    method: 'PUT',
    body: { owners },
  });
}

export async function putFirmStep(id: string, firm: DraftFirmData): Promise<FranchiseCreationDraft> {
  return request<FranchiseCreationDraft>(`/franchise-creation/${id}/step/firm`, { method: 'PUT', body: firm });
}

export async function putSalonStep(id: string, salon: DraftSalonData): Promise<FranchiseCreationDraft> {
  return request<FranchiseCreationDraft>(`/franchise-creation/${id}/step/salon`, { method: 'PUT', body: salon });
}

export async function putOfficialsStep(id: string, officials: DraftOfficialsData): Promise<FranchiseCreationDraft> {
  return request<FranchiseCreationDraft>(`/franchise-creation/${id}/step/officials`, {
    method: 'PUT',
    body: {
      clusterHeadOfficialId: Number(officials.clusterHeadOfficialId),
      regionalHeadOfficialId: Number(officials.regionalHeadOfficialId),
      stateHeadOfficialId: Number(officials.stateHeadOfficialId),
    },
  });
}

export async function putAgreementStep(id: string, agreement: DraftAgreementData): Promise<FranchiseCreationDraft> {
  return request<FranchiseCreationDraft>(`/franchise-creation/${id}/step/agreement`, {
    method: 'PUT',
    body: agreement,
  });
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
  return uploadMultipart<FranchiseCreationDraft>(`/franchise-creation/${id}/step/documents`, form);
}

/** POST /api/v1/franchise-creation/{id}/finalize — creates the real
 * Franchisee/Firm/Salon/Officials/Agreement/Documents records. Irreversible. */
export async function finalizeDraft(id: string): Promise<FinalizeResult> {
  return request<FinalizeResult>(`/franchise-creation/${id}/finalize`, { method: 'POST' });
}
