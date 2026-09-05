import { request, ApiError } from '@/lib/api';
import type { Official, SalonForOfficial } from '@/types';

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

// ---------------------------------------------------------------------------
// Official's own assigned salons — GET /api/v1/officials/me/salons(/{id})
// ---------------------------------------------------------------------------

interface RawSalonForOfficial {
  id: number;
  salonCode: string;
  legacyCode: string | null;
  salonName: string;
  salonFormat: string | null;
  squareFootage: number | null;
  launchDate: string | null;
  address: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  region: string | null;
  contactNumber1: string | null;
  contactNumber2: string | null;
  email: string | null;
  ratecard: string | null;
  latitude: number | null;
  longitude: number | null;
  operationalStatus: SalonForOfficial['operationalStatus'];
  currentRoyaltyPercentage: number | null;
  createdAt: string;
  updatedAt: string;
  firm: { id: number; legalName: string; companyType: 'PROPRIETORSHIP' | 'PRIVATE_LIMITED' | 'LLP'; gstNumber: string | null } | null;
  owners: Array<{ fullName: string | null; isPrimary: boolean }>;
}

function adaptSalonForOfficial(s: RawSalonForOfficial): SalonForOfficial {
  return {
    id: String(s.id),
    salonCode: s.salonCode,
    legacyCode: s.legacyCode ?? undefined,
    salonName: s.salonName,
    salonFormat: s.salonFormat ?? undefined,
    squareFootage: s.squareFootage ?? undefined,
    launchDate: s.launchDate ?? undefined,
    address: s.address ?? undefined,
    district: s.district ?? undefined,
    state: s.state ?? undefined,
    pincode: s.pincode ?? undefined,
    region: s.region ?? undefined,
    contactNumber1: s.contactNumber1 ?? undefined,
    contactNumber2: s.contactNumber2 ?? undefined,
    email: s.email ?? undefined,
    ratecard: s.ratecard ?? undefined,
    latitude: s.latitude ?? undefined,
    longitude: s.longitude ?? undefined,
    operationalStatus: s.operationalStatus,
    currentRoyaltyPercentage: s.currentRoyaltyPercentage,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    firm: s.firm
      ? { id: String(s.firm.id), legalName: s.firm.legalName, companyType: s.firm.companyType, gstNumber: s.firm.gstNumber ?? undefined }
      : null,
    owners: s.owners,
  };
}

/**
 * GET /api/v1/officials/me/salons — every salon where the calling user is the
 * assigned official (matched against clusterHeadId/regionalHeadId/stateHeadId per
 * their own Official.officialType). Returns [], not an error, if the caller isn't
 * linked to any Official record.
 */
export async function getMySalons(): Promise<SalonForOfficial[]> {
  const data = await request<unknown>('/officials/me/salons');
  return Array.isArray(data) ? (data as RawSalonForOfficial[]).map(adaptSalonForOfficial) : [];
}

/**
 * GET /api/v1/officials/me/salons/:salonId — 403s if the caller is a real official but
 * not the one assigned to this specific salon. Don't assume any id reachable from the
 * list also works here without checking for that 403.
 */
export async function getMySalon(salonId: string): Promise<SalonForOfficial> {
  const data = await request<RawSalonForOfficial>(`/officials/me/salons/${salonId}`);
  return adaptSalonForOfficial(data);
}
