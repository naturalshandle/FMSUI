import { request } from '@/lib/api';
import type { Page } from '@/lib/pagination';
import { requestWithStepUp } from '@/lib/stepUp';
import type { Franchisee } from '@/types';

const PAN_PATTERN = /^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/;

export function looksLikePan(value: string): boolean {
  return PAN_PATTERN.test(value.trim());
}

export interface FranchiseeSearchParams {
  search?: string;
  page?: number;
  size?: number;
}

/**
 * GET /api/v1/franchisees?search=&page=&size= — spec §4. If `search` matches the
 * PAN regex, the backend does an EXACT blind-index match (0-or-1 result, synthetic
 * totalPages/totalElements) rather than a partial search. Callers should check
 * looksLikePan(search) themselves and label the result "Exact PAN match" rather
 * than presenting normal pagination controls off that response.
 */
export async function searchFranchisees(params: FranchiseeSearchParams = {}): Promise<Page<Franchisee>> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  qs.set('page', String(params.page ?? 0));
  qs.set('size', String(params.size ?? 20));
  return request<Page<Franchisee>>(`/franchisees?${qs.toString()}`);
}

export async function getFranchisee(id: string): Promise<Franchisee> {
  return request<Franchisee>(`/franchisees/${id}`);
}

export interface UpdateFranchiseeInput {
  name?: string;
  dob?: string;
  contact?: string;
  address?: string;
}

/** PATCH /api/v1/franchisees/{id} — structurally excludes pan/aadhaar; true partial
 * update, only send changed fields. */
export async function updateFranchisee(id: string, input: UpdateFranchiseeInput): Promise<Franchisee> {
  return request<Franchisee>(`/franchisees/${id}`, { method: 'PATCH', body: input });
}

export interface SensitiveInfo {
  franchiseeId: string;
  pan: string;
  aadhaar: string;
}

/** GET /api/v1/admin/franchisees/{id}/sensitive-info/reveal — admin only, step-up
 * gated. Plaintext PAN/Aadhaar; the caller must treat this like a password-manager
 * reveal (auto-hide, never persisted in ambient state). */
export async function revealSensitiveInfo(id: string, stepUpToken: string): Promise<SensitiveInfo> {
  return requestWithStepUp<SensitiveInfo>(`/admin/franchisees/${id}/sensitive-info/reveal`, stepUpToken);
}

/** PATCH /api/v1/admin/franchisees/{id}/sensitive-info — admin only, step-up gated.
 * pan and aadhaar are both required together. */
export async function updateSensitiveInfo(
  id: string,
  input: { pan: string; aadhaar: string },
  stepUpToken: string,
): Promise<void> {
  await requestWithStepUp(`/admin/franchisees/${id}/sensitive-info`, stepUpToken, { method: 'PATCH', body: input });
}
