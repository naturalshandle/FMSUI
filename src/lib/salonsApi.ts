import { request } from '@/lib/api';
import type { Page } from '@/lib/pagination';
import type { Salon } from '@/types';

interface RawSalon {
  id: number;
  code?: string;
  laSalonCode?: string;
  name: string;
  format?: string;
  sqFt?: number;
  launchDate?: string;
  address?: string;
  district?: string;
  state?: string;
  pincode?: string;
  region?: string;
  primaryContact?: string;
  ratecard?: string;
  operationalStatus?: Salon['operationalStatus'];
  currentFirmId?: number;
  clusterHeadOfficialId?: number;
  regionalHeadOfficialId?: number;
  stateHeadOfficialId?: number;
  createdAt?: string;
  updatedAt?: string;
}

function adaptSalon(s: RawSalon): Salon {
  return {
    id: String(s.id),
    code: s.code,
    laSalonCode: s.laSalonCode,
    name: s.name,
    format: s.format,
    sqFt: s.sqFt,
    launchDate: s.launchDate,
    address: s.address,
    district: s.district,
    state: s.state,
    pincode: s.pincode,
    region: s.region,
    primaryContact: s.primaryContact,
    ratecard: s.ratecard,
    operationalStatus: s.operationalStatus,
    currentFirmId: s.currentFirmId != null ? String(s.currentFirmId) : undefined,
    clusterHeadOfficialId: s.clusterHeadOfficialId != null ? String(s.clusterHeadOfficialId) : undefined,
    regionalHeadOfficialId: s.regionalHeadOfficialId != null ? String(s.regionalHeadOfficialId) : undefined,
    stateHeadOfficialId: s.stateHeadOfficialId != null ? String(s.stateHeadOfficialId) : undefined,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export interface SalonSearchParams {
  region?: string;
  state?: string;
  operationalStatus?: string;
  search?: string;
  page?: number;
  size?: number;
}

/** GET /api/v1/salons?region=&state=&operationalStatus=&search=&page=&size= — spec
 * §5. `search` matches code, laSalonCode, or name (case-insensitive substring). Any
 * staff role can view/edit any salon, not just ones they're assigned to — confirmed
 * spec behavior, not a bug. */
export async function searchSalons(params: SalonSearchParams = {}): Promise<Page<Salon>> {
  const qs = new URLSearchParams();
  if (params.region) qs.set('region', params.region);
  if (params.state) qs.set('state', params.state);
  if (params.operationalStatus) qs.set('operationalStatus', params.operationalStatus);
  if (params.search) qs.set('search', params.search);
  qs.set('page', String(params.page ?? 0));
  qs.set('size', String(params.size ?? 20));

  const data = await request<Page<RawSalon>>(`/salons?${qs.toString()}`);
  return { ...data, content: data.content.map(adaptSalon) };
}

export async function getSalon(id: string): Promise<Salon> {
  const data = await request<RawSalon>(`/salons/${id}`);
  return adaptSalon(data);
}

export interface UpdateSalonInput {
  name?: string;
  format?: string;
  sqFt?: number;
  address?: string;
  district?: string;
  state?: string;
  region?: string;
  pincode?: string;
  primaryContact?: string;
  ratecard?: string;
  operationalStatus?: string;
}

/** PATCH /api/v1/salons/{id} — no firm field, no official-head-id fields; true
 * partial update, only send changed fields. */
export async function updateSalon(id: string, input: UpdateSalonInput): Promise<Salon> {
  const data = await request<RawSalon>(`/salons/${id}`, { method: 'PATCH', body: input });
  return adaptSalon(data);
}

/** POST /api/v1/salons/{id}/transfer — body {newFirmId, reason}. Own dedicated
 * action, not part of the edit form. */
export async function transferSalon(id: string, newFirmId: string, reason: string): Promise<Salon> {
  const data = await request<RawSalon>(`/salons/${id}/transfer`, {
    method: 'POST',
    body: { newFirmId: Number(newFirmId), reason },
  });
  return adaptSalon(data);
}
