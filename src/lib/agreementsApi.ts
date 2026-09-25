import { request } from '@/lib/api';
import type { Page } from '@/lib/pagination';
import type { Agreement } from '@/types';

export interface AgreementSearchParams {
  salonId?: string;
  status?: string;
  page?: number;
  size?: number;
  /** Spring sort spec, e.g. "validTill,asc". validTill is ISO yyyy-MM-dd text, so
   * lexical order is chronological. */
  sort?: string;
}

/** GET /api/v1/agreements?salonId=&status=&page=&size=&sort= — spec §6. `status` must be
 * a valid enum value via a select, never free text. */
export async function searchAgreements(params: AgreementSearchParams = {}): Promise<Page<Agreement>> {
  const qs = new URLSearchParams();
  if (params.salonId) qs.set('salonId', params.salonId);
  if (params.status) qs.set('status', params.status);
  qs.set('page', String(params.page ?? 0));
  qs.set('size', String(params.size ?? 20));
  if (params.sort) qs.set('sort', params.sort);
  return request<Page<Agreement>>(`/agreements?${qs.toString()}`);
}

export async function getAgreement(id: string): Promise<Agreement> {
  return request<Agreement>(`/agreements/${id}`);
}

/** PATCH /api/v1/agreements/{id} — royaltyTerms is the ONLY field on this DTO.
 * validFrom/validTill are structurally impossible to edit here — the backend
 * silently drops them if sent; use renewAgreement to change the end date. */
export async function updateAgreement(id: string, royaltyTerms: string): Promise<Agreement> {
  return request<Agreement>(`/agreements/${id}`, { method: 'PATCH', body: { royaltyTerms } });
}

export interface RenewAgreementInput {
  validFrom: string;
  newValidTill: string;
  royaltyTerms: string;
}

/** POST /api/v1/agreements/{id}/renew — creates a BRAND NEW agreement row (different
 * id, status ACTIVE); the old row becomes SUPERSEDED. Callers should navigate to the
 * new agreement's detail afterward, not stay on the old one. */
export async function renewAgreement(id: string, input: RenewAgreementInput): Promise<Agreement> {
  return request<Agreement>(`/agreements/${id}/renew`, { method: 'POST', body: input });
}

/** POST /api/v1/agreements/{id}/terminate — body {reason}. */
export async function terminateAgreement(id: string, reason: string): Promise<Agreement> {
  return request<Agreement>(`/agreements/${id}/terminate`, { method: 'POST', body: { reason } });
}
