import { API_BASE_URL, ApiError, getAccessToken, request } from '@/lib/api';

export type DocumentEntityType = 'FRANCHISEE' | 'FIRM' | 'SALON';

export interface DocumentRecord {
  id: string;
  entityType: DocumentEntityType;
  entityId: string;
  documentType: string;
  fileName?: string;
  verified?: boolean;
  uploadedAt?: string;
  [key: string]: unknown;
}

function adaptDocument(d: Record<string, unknown>): DocumentRecord {
  return {
    id: String(d.id),
    entityType: d.entityType as DocumentEntityType,
    entityId: String(d.entityId),
    documentType: d.documentType as string,
    fileName: d.fileName as string | undefined,
    verified: d.verified as boolean | undefined,
    uploadedAt: d.uploadedAt as string | undefined,
    ...d,
  };
}

/** POST /api/v1/documents — multipart form: entityType, entityId, documentType, file. */
export async function uploadDocument(
  entityType: DocumentEntityType,
  entityId: string,
  documentType: string,
  file: File,
): Promise<DocumentRecord> {
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
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new ApiError(res.status, data?.message || data?.error || `Document upload failed with status ${res.status}`);
  }
  return adaptDocument(data);
}

/** GET /api/v1/documents?entityType=&entityId= */
export async function listDocuments(entityType: DocumentEntityType, entityId: string): Promise<DocumentRecord[]> {
  const data = await request<unknown>(`/documents?entityType=${entityType}&entityId=${entityId}`);
  const arr = Array.isArray(data) ? (data as Record<string, unknown>[]) : ((data as { content?: Record<string, unknown>[] })?.content ?? []);
  return arr.map(adaptDocument);
}

export async function deleteDocument(id: string): Promise<void> {
  await request(`/documents/${id}`, { method: 'DELETE' });
}

/** POST /api/v1/admin/documents/:id/verify */
export async function verifyDocument(id: string): Promise<void> {
  await request(`/admin/documents/${id}/verify`, { method: 'POST' });
}
