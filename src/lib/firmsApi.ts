import { adaptFirm, request } from '@/lib/api';
import type { Page } from '@/lib/pagination';
import type { CompanyType, Firm } from '@/types';

export async function getFirm(id: string): Promise<Firm> {
  const data = await request<Parameters<typeof adaptFirm>[0]>(`/firms/${id}`);
  return adaptFirm(data);
}

export interface UpdateFirmInput {
  legalName?: string;
  companyType?: CompanyType;
  gstNumber?: string;
  fpCode?: string;
}

/** PATCH /api/v1/firms/{id} — true partial update, only send changed fields. */
export async function updateFirm(id: string, input: UpdateFirmInput): Promise<Firm> {
  const data = await request<Parameters<typeof adaptFirm>[0]>(`/firms/${id}`, { method: 'PATCH', body: input });
  return adaptFirm(data);
}

export interface FirmSearchParams {
  companyType?: string;
  search?: string;
  page?: number;
  size?: number;
}

/** GET /api/v1/firms?companyType=&search=&page=&size= — spec §4. `search` matches
 * legal name OR GST number, case-insensitive substring on both. */
export async function searchFirms(params: FirmSearchParams = {}): Promise<Page<Firm>> {
  const qs = new URLSearchParams();
  if (params.companyType) qs.set('companyType', params.companyType);
  if (params.search) qs.set('search', params.search);
  qs.set('page', String(params.page ?? 0));
  qs.set('size', String(params.size ?? 20));

  const data = await request<Page<Parameters<typeof adaptFirm>[0]>>(`/firms?${qs.toString()}`);
  return { ...data, content: data.content.map(adaptFirm) };
}

/**
 * POST /api/v1/firms/:id/owners — Add Owner. Body is {franchiseeId, reason} only —
 * no isPrimary field; the first-ever owner of a firm automatically becomes primary
 * server-side. Response is a single FirmOwnerResponse row, not the full firm — the
 * caller must refetch the firm afterward rather than trying to merge this in.
 */
export async function addFirmOwner(firmId: string, franchiseeId: number, reason: string): Promise<void> {
  await request(`/firms/${firmId}/owners`, { method: 'POST', body: { franchiseeId, reason } });
}

/**
 * DELETE /api/v1/firms/:id/owners/:franchiseeId — Remove Owner. Backend rejects
 * removing the last remaining owner, and rejects removing the primary owner while
 * others remain (409 in both cases) — the UI should disable those actions
 * client-side rather than relying on the error. Caller must refetch afterward.
 */
export async function removeFirmOwner(firmId: string, franchiseeId: string, reason: string): Promise<void> {
  await request(`/firms/${firmId}/owners/${franchiseeId}`, { method: 'DELETE', body: { reason } });
}

/**
 * POST /api/v1/firms/:id/owners/:franchiseeId/make-primary — Make Primary. Creates
 * new history rows for both the old and new primary server-side (ids change) —
 * always refetch the full owners list afterward rather than patching local state.
 */
export async function makeFirmOwnerPrimary(firmId: string, franchiseeId: string, reason: string): Promise<void> {
  await request(`/firms/${firmId}/owners/${franchiseeId}/make-primary`, { method: 'POST', body: { reason } });
}
