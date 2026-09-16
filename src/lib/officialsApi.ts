import { request, ApiError } from '@/lib/api';
import type { Page } from '@/lib/pagination';
import type { Official } from '@/types';

interface RawOfficial {
  id: number;
  officialType: string;
  name: string;
  contact: string;
  email?: string;
  region?: string;
  userId?: number | null;
}

function adaptOfficial(o: RawOfficial): Official {
  return {
    id: String(o.id),
    officialType: o.officialType,
    name: o.name,
    contact: o.contact,
    email: o.email,
    region: o.region,
    userId: o.userId != null ? String(o.userId) : null,
  };
}

export interface OfficialsListParams {
  officialType?: string;
  region?: string;
  page?: number;
  size?: number;
}

/** GET /api/v1/officials — open to all 5 staff roles (spec §2). Returns Page<OfficialResponse>. */
export async function listOfficials(params: OfficialsListParams = {}): Promise<Page<Official>> {
  const qs = new URLSearchParams();
  if (params.officialType) qs.set('officialType', params.officialType);
  if (params.region) qs.set('region', params.region);
  qs.set('page', String(params.page ?? 0));
  qs.set('size', String(params.size ?? 20));

  const data = await request<Page<RawOfficial>>(`/officials?${qs.toString()}`);
  return { ...data, content: data.content.map(adaptOfficial) };
}

/** GET /api/v1/officials/{id} — also open to all 5 staff roles. */
export async function getOfficial(id: string): Promise<Official> {
  const data = await request<RawOfficial>(`/officials/${id}`);
  return adaptOfficial(data);
}

export interface CreateOfficialInput {
  officialType: string;
  name: string;
  contact?: string;
  email?: string;
  region?: string;
  userId?: number | null;
  createLogin?: boolean;
}

/** POST /api/v1/admin/officials — admin only. userId and createLogin are mutually
 * exclusive; enforce that in the UI, not here. */
export async function createOfficial(input: CreateOfficialInput): Promise<Official> {
  const data = await request<RawOfficial>('/admin/officials', { method: 'POST', body: input });
  return adaptOfficial(data);
}

export interface UpdateOfficialInput {
  officialType: string;
  name: string;
  contact?: string;
  email?: string;
  region?: string;
}

/** PATCH /api/v1/admin/officials/{id} — admin only. This is a FULL replace despite
 * the PATCH verb: always resubmit every field from the last GET, never a partial
 * diff (unlike Franchisee/Firm/Salon PATCH). The input type is intentionally
 * required-not-partial to make that structurally hard to get wrong at call sites. */
export async function updateOfficial(id: string, input: UpdateOfficialInput): Promise<Official> {
  const data = await request<RawOfficial>(`/admin/officials/${id}`, { method: 'PATCH', body: input });
  return adaptOfficial(data);
}

/** POST /api/v1/admin/officials/{id}/link-user — admin only. */
export async function linkUserToOfficial(id: string, userId: number): Promise<Official> {
  const data = await request<RawOfficial>(`/admin/officials/${id}/link-user`, {
    method: 'POST',
    body: { userId },
  });
  return adaptOfficial(data);
}

/**
 * DELETE /api/v1/admin/officials/{id} — admin only. No referential-integrity check
 * exists server-side (deleting an official still assigned to a live salon is
 * possible and unguarded), so the confirm dialog needs an extra-strong warning, not
 * a routine one. Kept as a distinct error type in case a future backend version
 * adds the 409-with-count check described defensively here.
 */
export class OfficialInUseError extends Error {
  count?: number;
  constructor(message: string, count?: number) {
    super(message);
    this.count = count;
  }
}

export async function deleteOfficial(id: string): Promise<void> {
  try {
    await request(`/admin/officials/${id}`, { method: 'DELETE' });
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      const match = err.message.match(/(\d+)/);
      throw new OfficialInUseError(err.message, match ? Number(match[1]) : undefined);
    }
    throw err;
  }
}
