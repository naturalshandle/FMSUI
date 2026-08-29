import { request, ApiError } from '@/lib/api';
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

export interface OfficialsPage {
  content: Official[];
  totalElements: number;
}

export async function listOfficials(params: OfficialsListParams = {}): Promise<OfficialsPage> {
  const qs = new URLSearchParams();
  if (params.officialType) qs.set('officialType', params.officialType);
  if (params.region) qs.set('region', params.region);
  qs.set('page', String(params.page ?? 0));
  qs.set('size', String(params.size ?? 200));

  const data = await request<unknown>(`/admin/officials?${qs.toString()}`);
  const raw = data as Record<string, unknown>;
  const contentArr: RawOfficial[] = Array.isArray(data)
    ? (data as RawOfficial[])
    : (Array.isArray(raw?.content) ? (raw.content as RawOfficial[]) : []);
  return {
    content: contentArr.map(adaptOfficial),
    totalElements: (raw?.totalElements as number) ?? contentArr.length,
  };
}

export async function getOfficial(id: string): Promise<Official> {
  const data = await request<RawOfficial>(`/admin/officials/${id}`);
  return adaptOfficial(data);
}

export interface CreateOfficialInput {
  officialType: string;
  name: string;
  contact: string;
  email?: string;
  region?: string;
  userId?: number | null;
}

export async function createOfficial(input: CreateOfficialInput): Promise<Official> {
  const data = await request<RawOfficial>('/admin/officials', { method: 'POST', body: input });
  return adaptOfficial(data);
}

export interface UpdateOfficialInput {
  officialType?: string;
  name?: string;
  contact?: string;
  email?: string;
  region?: string;
}

export async function updateOfficial(id: string, input: UpdateOfficialInput): Promise<Official> {
  const data = await request<RawOfficial>(`/admin/officials/${id}`, { method: 'PATCH', body: input });
  return adaptOfficial(data);
}

export async function linkUserToOfficial(id: string, userId: number): Promise<Official> {
  const data = await request<RawOfficial>(`/admin/officials/${id}/link-user`, {
    method: 'POST',
    body: { userId },
  });
  return adaptOfficial(data);
}

/**
 * DELETE /api/v1/admin/officials/:id — backend returns 409 with an assignment count
 * when the official is still assigned to one or more salons. We surface that count
 * distinctly so the caller can show a specific message instead of a generic failure.
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
