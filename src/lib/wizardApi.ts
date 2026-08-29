/**
 * "Add Franchisee" wizard — API calls for the legacy/real data-entry flow.
 *
 * UNCONFIRMED CONTRACT — see src/types/wizard.ts. Every endpoint path, request body
 * shape, and response shape below is a best guess from the prompt, not verified
 * against real backend source (no backend repo was available in this environment).
 * Reconcile against the actual backend DTOs before treating this as production-ready.
 */
import { API_BASE_URL, ApiError, getAccessToken, request } from '@/lib/api';
import type {
  WizardCompletion,
  WizardDocumentEntity,
  WizardDocumentType,
  WizardFirm,
  WizardFirmInput,
  WizardOwner,
  WizardOwnerInput,
  WizardSalon,
  WizardSalonInput,
} from '@/types/wizard';

interface RawWizardOwner extends WizardOwnerInput {
  id: number;
}

/**
 * Confirmed response shape for POST /api/v1/admin/firms: the firm's name comes back
 * as `name`, not `legalName` — the request and response use different field names.
 * franchiseeId is the primary owner's id. firmType/gstNumber/fpCode/owners are not
 * guaranteed present on the response, so we fall back to what we sent.
 */
interface RawWizardFirmResponse {
  id: number;
  franchiseeId: number;
  name: string;
  firmType?: WizardFirmInput['firmType'];
  gstNumber?: string;
  fpCode?: string;
  owners?: WizardFirmInput['owners'];
}

interface RawWizardSalon extends WizardSalonInput {
  id: number;
}

export async function createWizardOwner(input: WizardOwnerInput): Promise<WizardOwner> {
  const data = await request<RawWizardOwner>('/admin/franchisees', { method: 'POST', body: input });
  return { ...data, id: String(data.id) };
}

export async function createWizardFirm(input: WizardFirmInput): Promise<WizardFirm> {
  const data = await request<RawWizardFirmResponse>('/admin/firms', { method: 'POST', body: input });
  return {
    id: String(data.id),
    franchiseeId: String(data.franchiseeId),
    legalName: data.name,
    firmType: data.firmType ?? input.firmType,
    gstNumber: data.gstNumber ?? input.gstNumber,
    fpCode: data.fpCode ?? input.fpCode,
    owners: data.owners ?? input.owners,
  };
}

export async function createWizardSalon(input: WizardSalonInput): Promise<WizardSalon> {
  const data = await request<RawWizardSalon>(`/admin/firms/${input.firmId}/salons`, {
    method: 'POST',
    body: input,
  });
  return { ...data, id: String(data.id) };
}

export async function getWizardCompletion(franchiseeId: string): Promise<WizardCompletion> {
  return request<WizardCompletion>(`/admin/franchisees/${franchiseeId}/completion`);
}

/**
 * Best-guess multipart upload — mirrors the pattern described as "already built
 * elsewhere in the app" for POST /documents, which does not actually exist yet
 * anywhere in this codebase. Written fresh; reconcile against the real endpoint
 * once it's confirmed.
 */
export async function uploadWizardDocument(
  entityType: WizardDocumentEntity,
  entityId: string,
  documentType: WizardDocumentType,
  file: File,
): Promise<void> {
  const form = new FormData();
  form.append('entityType', entityType);
  form.append('entityId', entityId);
  form.append('documentType', documentType);
  form.append('file', file);

  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/documents`, { method: 'POST', headers, body: form });
  } catch {
    throw new ApiError(0, 'Cannot reach the server to upload the document.');
  }
  if (!res.ok) {
    let message = `Document upload failed with status ${res.status}`;
    try {
      const data = await res.json();
      message = data?.message || data?.error || message;
    } catch {
      // ignore parse failure, keep default message
    }
    throw new ApiError(res.status, message);
  }
}
