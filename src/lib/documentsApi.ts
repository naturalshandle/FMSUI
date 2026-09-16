import { API_BASE_URL, ApiError, getAccessToken, request } from '@/lib/api';
import { uploadMultipart } from '@/lib/uploads';

export type DocumentEntityType = 'FRANCHISEE' | 'SALON';
export type DocumentVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface DocumentRecord {
  id: string;
  entityType: DocumentEntityType;
  entityId: string;
  documentType: string;
  fileName: string;
  uploadedAt: string;
  verificationStatus: DocumentVerificationStatus;
  verifiedByUserId?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  deletedAt?: string;
  supersededByDocumentId?: string;
  replacesDocumentId?: string;
}

interface RawDocument {
  id: number;
  entityType: DocumentEntityType;
  entityId: number;
  documentType: string;
  fileName: string;
  uploadedAt: string;
  verificationStatus: DocumentVerificationStatus;
  verifiedByUserId?: number | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  deletedAt?: string | null;
  supersededByDocumentId?: number | null;
  replacesDocumentId?: number | null;
}

function adaptDocument(d: RawDocument): DocumentRecord {
  return {
    id: String(d.id),
    entityType: d.entityType,
    entityId: String(d.entityId),
    documentType: d.documentType,
    fileName: d.fileName,
    uploadedAt: d.uploadedAt,
    verificationStatus: d.verificationStatus,
    verifiedByUserId: d.verifiedByUserId != null ? String(d.verifiedByUserId) : undefined,
    verifiedAt: d.verifiedAt ?? undefined,
    rejectionReason: d.rejectionReason ?? undefined,
    deletedAt: d.deletedAt ?? undefined,
    supersededByDocumentId: d.supersededByDocumentId != null ? String(d.supersededByDocumentId) : undefined,
    replacesDocumentId: d.replacesDocumentId != null ? String(d.replacesDocumentId) : undefined,
  };
}

/** GET /api/v1/documents?entityType=&entityId= — plain array, no pagination, only
 * non-deleted docs. There is no generic upload endpoint here — documents are only
 * ever created via the Franchise Creation wizard's step 6, or Admin's Replace
 * action below. Don't build an "Upload Document" button on this panel. */
export async function listDocuments(entityType: DocumentEntityType, entityId: string): Promise<DocumentRecord[]> {
  const data = await request<RawDocument[]>(`/documents?entityType=${entityType}&entityId=${entityId}`);
  return data.map(adaptDocument);
}

/** GET /api/v1/documents/{id}/download — raw bytes. Fetched as a blob with the auth
 * header (not a plain <a href>) since it needs the Bearer token, then triggers a
 * browser save. */
export async function downloadDocument(id: string, suggestedFileName: string): Promise<void> {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/documents/${id}/download`, { headers });
  } catch {
    throw new ApiError(0, 'Cannot reach the server to download the document.');
  }
  if (!res.ok) {
    if (res.status === 404) throw new ApiError(404, 'This document is no longer available.');
    throw new ApiError(res.status, `Download failed with status ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedFileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** POST /api/v1/admin/documents/{id}/verify — admin only. body {approved, reason};
 * reason required only when approved:false. */
export async function verifyDocument(id: string, approved: boolean, reason?: string): Promise<DocumentRecord> {
  const data = await request<RawDocument>(`/admin/documents/${id}/verify`, {
    method: 'POST',
    body: { approved, reason },
  });
  return adaptDocument(data);
}

/** DELETE /api/v1/admin/documents/{id} — admin only. Returns 200 (soft-deleted),
 * not 204 — don't rely on request()'s 204 short-circuit. */
export async function deleteDocument(id: string): Promise<void> {
  await request(`/admin/documents/${id}`, { method: 'DELETE' });
}

/** POST /api/v1/admin/documents/{id}/replace — admin only, multipart field name
 * "file". Creates a new document row (old one soft-deleted with
 * supersededByDocumentId); the new row always starts PENDING regardless of the old
 * status. Same lack of server-side type/size validation as other uploads — any
 * client-side allow-list here is a UX courtesy only, not a security control. */
export async function replaceDocument(id: string, file: File): Promise<DocumentRecord> {
  const form = new FormData();
  form.append('file', file);
  const data = await uploadMultipart<RawDocument>(`/admin/documents/${id}/replace`, form);
  return adaptDocument(data);
}
