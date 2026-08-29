import { adaptFirm, request } from '@/lib/api';
import type { CompanyType, Firm } from '@/types';

export async function getFirm(id: string): Promise<Firm> {
  const data = await request<Parameters<typeof adaptFirm>[0]>(`/firms/${id}`);
  return adaptFirm(data);
}

export interface CreateFirmInput {
  legalName: string;
  companyType: CompanyType;
  gstNumber?: string;
  fpCode?: string;
}

/** POST /api/v1/franchisees/:franchiseeId/firms (self-service, single owner implied by the parent franchisee). */
export async function createFirmSelfService(franchiseeId: string, input: CreateFirmInput): Promise<Firm> {
  const data = await request<Parameters<typeof adaptFirm>[0]>(`/franchisees/${franchiseeId}/firms`, {
    method: 'POST',
    body: {
      legalName: input.legalName,
      companyType: input.companyType,
      gstNumber: input.gstNumber,
      fpCode: input.fpCode,
    },
  });
  return adaptFirm(data);
}

export interface AdminFirmOwnerInput {
  franchiseeId: number;
  isPrimary: boolean;
}

export interface CreateFirmAdminInput extends CreateFirmInput {
  owners: AdminFirmOwnerInput[];
}

/** POST /api/v1/admin/firms — takes an `owners` array at creation time. */
export async function createFirmAdmin(input: CreateFirmAdminInput): Promise<Firm> {
  const data = await request<Parameters<typeof adaptFirm>[0]>('/admin/firms', {
    method: 'POST',
    body: {
      legalName: input.legalName,
      companyType: input.companyType,
      gstNumber: input.gstNumber,
      fpCode: input.fpCode,
      owners: input.owners,
    },
  });
  return adaptFirm(data);
}

export interface UpdateFirmInput {
  legalName?: string;
  companyType?: CompanyType;
  gstNumber?: string;
  fpCode?: string;
}

export async function updateFirm(id: string, input: UpdateFirmInput, asAdmin = false): Promise<Firm> {
  const path = asAdmin ? `/admin/firms/${id}` : `/firms/${id}`;
  const data = await request<Parameters<typeof adaptFirm>[0]>(path, { method: 'PATCH', body: input });
  return adaptFirm(data);
}

export interface AdminFirmDirectoryParams {
  companyType?: string;
  search?: string;
  page?: number;
  size?: number;
}

export interface AdminFirmDirectoryPage {
  content: Firm[];
  totalElements: number;
}

/** GET /api/v1/admin/firms — Company / Firm directory. */
export async function listFirmsAdmin(params: AdminFirmDirectoryParams = {}): Promise<AdminFirmDirectoryPage> {
  const qs = new URLSearchParams();
  if (params.companyType) qs.set('companyType', params.companyType);
  if (params.search) qs.set('search', params.search);
  qs.set('page', String(params.page ?? 0));
  qs.set('size', String(params.size ?? 50));

  const data = await request<unknown>(`/admin/firms?${qs.toString()}`);
  const raw = data as Record<string, unknown>;
  const contentArr = Array.isArray(data)
    ? (data as Parameters<typeof adaptFirm>[0][])
    : (Array.isArray(raw?.content) ? (raw.content as Parameters<typeof adaptFirm>[0][]) : []);

  return {
    content: contentArr.map(adaptFirm),
    totalElements: (raw?.totalElements as number) ?? contentArr.length,
  };
}

/** POST /api/v1/firms/:id/owners — Add Owner. */
export async function addFirmOwner(firmId: string, franchiseeId: number, isPrimary: boolean, reason: string): Promise<Firm> {
  const data = await request<Parameters<typeof adaptFirm>[0]>(`/firms/${firmId}/owners`, {
    method: 'POST',
    body: { franchiseeId, isPrimary, reason },
  });
  return adaptFirm(data);
}

/**
 * DELETE /api/v1/firms/:id/owners/:franchiseeId — Remove Owner.
 * Backend rejects removing the primary owner while other owners remain; the caller
 * should catch that ApiError and prompt to reassign primary first rather than showing
 * a generic failure message.
 */
export async function removeFirmOwner(firmId: string, franchiseeId: string, reason: string): Promise<Firm> {
  const data = await request<Parameters<typeof adaptFirm>[0]>(`/firms/${firmId}/owners/${franchiseeId}`, {
    method: 'DELETE',
    body: { reason },
  });
  return adaptFirm(data);
}

/** POST /api/v1/firms/:id/owners/:franchiseeId/make-primary — Make Primary. */
export async function makeFirmOwnerPrimary(firmId: string, franchiseeId: string, reason: string): Promise<Firm> {
  const data = await request<Parameters<typeof adaptFirm>[0]>(`/firms/${firmId}/owners/${franchiseeId}/make-primary`, {
    method: 'POST',
    body: { reason },
  });
  return adaptFirm(data);
}
