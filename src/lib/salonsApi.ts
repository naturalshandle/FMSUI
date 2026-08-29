import { adaptSalon, request } from '@/lib/api';
import type { Salon } from '@/types';

export interface SalonInput {
  salonCode?: string;
  legacyCode?: string;
  salonName: string;
  salonFormat?: string;
  squareFootage?: number;
  launchDate?: string;
  address?: string;
  district?: string;
  state?: string;
  pincode?: string;
  region?: string;
  contactNumber1?: string;
  contactNumber2?: string;
  email?: string;
  ratecard?: string;
  latitude?: number;
  longitude?: number;
  operationalStatus?: string;
  clusterHeadId?: number;
  regionalHeadId?: number;
  stateHeadId?: number;
}

/**
 * POST /api/v1/firms/:firmId/salons — self-service create. The firm id is nested in
 * the URL path, NOT included in the request body. Genuinely different shape from the
 * admin create below — do not share a payload builder between the two.
 */
export async function createSalonSelfService(firmId: string, input: SalonInput): Promise<Salon> {
  const data = await request<Parameters<typeof adaptSalon>[0]>(`/firms/${firmId}/salons`, {
    method: 'POST',
    body: input,
  });
  return adaptSalon(data);
}

/**
 * POST /api/v1/admin/salons — admin create. Here firmId travels INSIDE the request
 * body, not the URL. Genuinely different shape from the self-service create above.
 */
export async function createSalonAdmin(firmId: string, input: SalonInput): Promise<Salon> {
  const data = await request<Parameters<typeof adaptSalon>[0]>('/admin/salons', {
    method: 'POST',
    body: { firmId: Number(firmId), ...input },
  });
  return adaptSalon(data);
}

export async function getSalon(id: string): Promise<Salon> {
  const data = await request<Parameters<typeof adaptSalon>[0]>(`/salons/${id}`);
  return adaptSalon(data);
}

export async function updateSalon(id: string, input: Partial<SalonInput>, asAdmin = false): Promise<Salon> {
  const path = asAdmin ? `/admin/salons/${id}` : `/salons/${id}`;
  const data = await request<Parameters<typeof adaptSalon>[0]>(path, { method: 'PATCH', body: input });
  return adaptSalon(data);
}

/**
 * POST /api/v1/salons/:id/transfer-firm (self-service) or
 * /api/v1/admin/salons/:id/transfer-firm (admin). Body field is `companyId`, distinct
 * from the `firmId` field used at salon creation despite meaning the same thing.
 */
export async function transferSalonFirm(salonId: string, companyId: string, reason: string, asAdmin = false): Promise<void> {
  const path = asAdmin ? `/admin/salons/${salonId}/transfer-firm` : `/salons/${salonId}/transfer-firm`;
  await request(path, {
    method: 'POST',
    body: { companyId: Number(companyId), reason },
  });
}

export interface AdminSalonDirectoryParams {
  operationalStatus?: string;
  region?: string;
  state?: string;
  page?: number;
  size?: number;
}

export interface AdminSalonDirectoryPage {
  content: Salon[];
  totalElements: number;
}

export async function listSalonsAdmin(params: AdminSalonDirectoryParams = {}): Promise<AdminSalonDirectoryPage> {
  const qs = new URLSearchParams();
  if (params.operationalStatus) qs.set('operationalStatus', params.operationalStatus);
  if (params.region) qs.set('region', params.region);
  if (params.state) qs.set('state', params.state);
  qs.set('page', String(params.page ?? 0));
  qs.set('size', String(params.size ?? 50));

  const data = await request<unknown>(`/admin/salons?${qs.toString()}`);
  const raw = data as Record<string, unknown>;
  const contentArr = Array.isArray(data)
    ? (data as Parameters<typeof adaptSalon>[0][])
    : (Array.isArray(raw?.content) ? (raw.content as Parameters<typeof adaptSalon>[0][]) : []);

  return {
    content: contentArr.map(adaptSalon),
    totalElements: (raw?.totalElements as number) ?? contentArr.length,
  };
}
