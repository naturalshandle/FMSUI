import { API_BASE_URL, ApiError, getAccessToken, request } from '@/lib/api';
import { uploadMultipart } from '@/lib/uploads';

export type SalonAuditStatus = 'IN_PROGRESS' | 'SUBMITTED';
export type SalonAuditReviewStatus = 'COMPLETE' | 'FLAGGED';

export interface SalonAuditPhoto {
  id: string;
  salonAuditId: string;
  areaLabel: string;
  fileName: string;
  uploadedByUserId: string;
  uploadedAt: string;
}

export interface SalonAudit {
  id: string;
  salonId: string;
  conductedByUserId: string;
  auditDate: string;
  status: SalonAuditStatus;
  reviewStatus: SalonAuditReviewStatus | null;
  reviewNotes?: string;
  reviewedByUserId?: string;
  reviewedAt?: string;
  photoCount: number;
  createdAt: string;
}

export interface SalonAuditDetail extends SalonAudit {
  photos: SalonAuditPhoto[];
}

interface RawSalonAudit {
  id: number;
  salonId: number;
  conductedByUserId: number;
  auditDate: string;
  status: SalonAuditStatus;
  reviewStatus: SalonAuditReviewStatus | null;
  reviewNotes?: string | null;
  reviewedByUserId?: number | null;
  reviewedAt?: string | null;
  photoCount: number;
  createdAt: string;
}

function adaptAudit(a: RawSalonAudit): SalonAudit {
  return {
    id: String(a.id),
    salonId: String(a.salonId),
    conductedByUserId: String(a.conductedByUserId),
    auditDate: a.auditDate,
    status: a.status,
    reviewStatus: a.reviewStatus,
    reviewNotes: a.reviewNotes ?? undefined,
    reviewedByUserId: a.reviewedByUserId != null ? String(a.reviewedByUserId) : undefined,
    reviewedAt: a.reviewedAt ?? undefined,
    photoCount: a.photoCount,
    createdAt: a.createdAt,
  };
}

/** POST /api/v1/salons/{salonId}/audits — no body. No server-side duplicate/date-
 * collision check exists — callers should check listSalonAudits for an existing
 * IN_PROGRESS entry for today before calling this, rather than creating a
 * duplicate. Visible only for the salon's assigned RM/CM/SH or Admin. */
export async function startAudit(salonId: string): Promise<SalonAudit> {
  const data = await request<RawSalonAudit>(`/salons/${salonId}/audits`, { method: 'POST' });
  return adaptAudit(data);
}

/** GET /api/v1/salons/{salonId}/audits — plain array, ordered by auditDate desc, no
 * pagination, visible to any staff role. */
export async function listSalonAudits(salonId: string): Promise<SalonAudit[]> {
  const data = await request<RawSalonAudit[]>(`/salons/${salonId}/audits`);
  return data.map(adaptAudit);
}

/** GET /api/v1/salon-audits/{id} — includes photos[], no ownership restriction on
 * reading (any staff role). */
export async function getSalonAuditDetail(id: string): Promise<SalonAuditDetail> {
  const data = await request<RawSalonAudit & { photos: (Omit<SalonAuditPhoto, 'id' | 'salonAuditId' | 'uploadedByUserId'> & { id: number; salonAuditId: number; uploadedByUserId: number })[] }>(
    `/salon-audits/${id}`,
  );
  return {
    ...adaptAudit(data),
    photos: data.photos.map((p) => ({
      id: String(p.id),
      salonAuditId: String(p.salonAuditId),
      areaLabel: p.areaLabel,
      fileName: p.fileName,
      uploadedByUserId: String(p.uploadedByUserId),
      uploadedAt: p.uploadedAt,
    })),
  };
}

/** POST /api/v1/salon-audits/{id}/photos — multipart {areaLabel, file}. areaLabel
 * is free text by design (salons don't share a uniform floor plan) — never
 * constrain it to a fixed list. Only while status === 'IN_PROGRESS', only for the
 * conducting official or Admin. */
export async function uploadAuditPhoto(id: string, areaLabel: string, file: File): Promise<SalonAuditPhoto> {
  const form = new FormData();
  form.append('areaLabel', areaLabel);
  form.append('file', file);
  const p = await uploadMultipart<{ id: number; salonAuditId: number; areaLabel: string; fileName: string; uploadedByUserId: number; uploadedAt: string }>(
    `/salon-audits/${id}/photos`,
    form,
  );
  return {
    id: String(p.id),
    salonAuditId: String(p.salonAuditId),
    areaLabel: p.areaLabel,
    fileName: p.fileName,
    uploadedByUserId: String(p.uploadedByUserId),
    uploadedAt: p.uploadedAt,
  };
}

/** GET /api/v1/salon-audits/{auditId}/photos/{photoId}/download — raw image bytes
 * (Content-Disposition: inline, Content-Type: application/octet-stream). Fetched
 * as a blob with the auth header (same pattern as documentsApi.downloadDocument)
 * since a plain <img src> can't carry the Bearer token; the caller turns the blob
 * into an object URL for display. Viewing is unscoped by role — any staff role
 * that can load the audit detail can view its photos. */
export async function fetchAuditPhotoBlob(auditId: string, photoId: string): Promise<Blob> {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/salon-audits/${auditId}/photos/${photoId}/download`, { headers });
  } catch {
    throw new ApiError(0, 'Cannot reach the server to load the photo.');
  }
  if (!res.ok) {
    if (res.status === 404) throw new ApiError(404, 'This photo is no longer available.');
    throw new ApiError(res.status, `Failed to load photo (status ${res.status}).`);
  }
  return res.blob();
}

/** POST /api/v1/salon-audits/{id}/submit — no body. Requires >=1 uploaded photo
 * server-side; mirror that check client-side before enabling the button. */
export async function submitAudit(id: string): Promise<SalonAudit> {
  const data = await request<RawSalonAudit>(`/salon-audits/${id}/submit`, { method: 'POST' });
  return adaptAudit(data);
}

/** POST /api/v1/salon-audits/{id}/review — body {status, notes}; notes required
 * only when status is FLAGGED. Only reachable when status === 'SUBMITTED'. */
export async function reviewSalonAudit(id: string, status: SalonAuditReviewStatus, notes?: string): Promise<SalonAudit> {
  const data = await request<RawSalonAudit>(`/salon-audits/${id}/review`, { method: 'POST', body: { status, notes } });
  return adaptAudit(data);
}
