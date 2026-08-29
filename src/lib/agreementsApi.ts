import { request } from '@/lib/api';
import type { Agreement } from '@/types';

interface RawAgreement {
  id: number;
  salonId?: number;
  validFrom: string;
  validTill: string;
  contractYear?: number;
  renewalYear?: number;
  royaltyTerms?: string;
  status?: string;
  createdAt?: string;
}

function adaptAgreement(a: RawAgreement, salonId: string): Agreement {
  return {
    id: String(a.id),
    salonId: a.salonId != null ? String(a.salonId) : salonId,
    validFrom: a.validFrom,
    validTill: a.validTill,
    contractYear: a.contractYear,
    renewalYear: a.renewalYear,
    royaltyTerms: a.royaltyTerms,
    status: a.status,
    createdAt: a.createdAt,
  };
}

export interface AgreementCreateInput {
  validFrom: string;
  validTill: string;
  contractYear?: number;
  renewalYear?: number;
  royaltyTerms?: string;
}

export async function createAgreement(salonId: string, input: AgreementCreateInput, asAdmin = false): Promise<Agreement> {
  const path = asAdmin ? `/admin/salons/${salonId}/agreements` : `/salons/${salonId}/agreements`;
  const data = await request<RawAgreement>(path, { method: 'POST', body: input });
  return adaptAgreement(data, salonId);
}

export async function listAgreements(salonId: string, asAdmin = false): Promise<Agreement[]> {
  const path = asAdmin ? `/admin/salons/${salonId}/agreements` : `/salons/${salonId}/agreements`;
  const data = await request<unknown>(path);
  const arr = Array.isArray(data) ? (data as RawAgreement[]) : ((data as { content?: RawAgreement[] })?.content ?? []);
  return arr.map((a) => adaptAgreement(a, salonId));
}

export async function getAgreement(id: string, asAdmin = false): Promise<Agreement> {
  const path = asAdmin ? `/admin/agreements/${id}` : `/agreements/${id}`;
  const data = await request<RawAgreement>(path);
  return adaptAgreement(data, '');
}

/**
 * PATCH /agreements/:id (self-service) or /admin/agreements/:id (admin).
 * `validTill` is intentionally excluded from this DTO by the backend — changing the
 * end date requires Renew instead. Only send the fields below.
 */
export interface AgreementUpdateInput {
  validFrom?: string;
  contractYear?: number;
  renewalYear?: number;
  royaltyTerms?: string;
}

export async function updateAgreement(id: string, input: AgreementUpdateInput, asAdmin = false): Promise<Agreement> {
  const path = asAdmin ? `/admin/agreements/${id}` : `/agreements/${id}`;
  const data = await request<RawAgreement>(path, { method: 'PATCH', body: input });
  return adaptAgreement(data, '');
}

/** POST /agreements/:id/renew — creates a new agreement record and supersedes the old one. */
export async function renewAgreement(id: string, input: AgreementCreateInput, asAdmin = false): Promise<Agreement> {
  const path = asAdmin ? `/admin/agreements/${id}/renew` : `/agreements/${id}/renew`;
  const data = await request<RawAgreement>(path, { method: 'POST', body: input });
  return adaptAgreement(data, '');
}

export async function terminateAgreement(id: string, reason: string, asAdmin = false): Promise<void> {
  const path = asAdmin ? `/admin/agreements/${id}/terminate` : `/agreements/${id}/terminate`;
  await request(path, { method: 'POST', body: { reason } });
}
