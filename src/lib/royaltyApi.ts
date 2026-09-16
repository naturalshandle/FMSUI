import { request } from '@/lib/api';
import type { RoyaltyDecisionState, RoyaltyOverallStatus, RoyaltyRequest } from '@/types';
import type { StatusBucket } from '@/components/ui/StatusBadge';

/** Response is IDs-only, no salonName/requestedByName on the wire — spec §8. */
interface RawRoyaltyRequest {
  id: number;
  salonId: number;
  currentPercentage: number | null;
  newPercentage: number;
  newRoyaltyType?: string;
  reason: string;
  instructedBy: string | null;
  requestedBy: number;
  skippedStateHeadStep?: boolean;
  overallStatus: RoyaltyOverallStatus;
  stateHeadDecision: RoyaltyDecisionState;
  stateHeadDecidedBy: number | null;
  stateHeadDecidedAt: string | null;
  stateHeadReason: string | null;
  adminDecision: RoyaltyDecisionState;
  adminDecidedBy: number | null;
  adminDecidedAt: string | null;
  adminReason: string | null;
  createdAt: string;
  updatedAt: string;
}

function adaptRoyaltyRequest(r: RawRoyaltyRequest): RoyaltyRequest {
  return {
    id: String(r.id),
    salonId: String(r.salonId),
    currentPercentage: r.currentPercentage,
    newPercentage: r.newPercentage,
    newRoyaltyType: r.newRoyaltyType,
    reason: r.reason,
    instructedBy: r.instructedBy ?? undefined,
    requestedBy: String(r.requestedBy),
    skippedStateHeadStep: r.skippedStateHeadStep,
    overallStatus: r.overallStatus,
    stateHeadDecision: r.stateHeadDecision,
    stateHeadDecidedBy: r.stateHeadDecidedBy != null ? String(r.stateHeadDecidedBy) : undefined,
    stateHeadDecidedAt: r.stateHeadDecidedAt ?? undefined,
    stateHeadReason: r.stateHeadReason ?? undefined,
    adminDecision: r.adminDecision,
    adminDecidedBy: r.adminDecidedBy != null ? String(r.adminDecidedBy) : undefined,
    adminDecidedAt: r.adminDecidedAt ?? undefined,
    adminReason: r.adminReason ?? undefined,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function adaptList(data: RawRoyaltyRequest[]): RoyaltyRequest[] {
  return data.map(adaptRoyaltyRequest);
}

export interface SubmitRoyaltyRequestInput {
  newPercentage: number;
  newRoyaltyType: string;
  reason: string;
  instructedBy?: string;
}

/**
 * POST /api/v1/salons/{salonId}/royalty-requests — RM/CM/SH only, and only for the
 * assigned salon; 403s otherwise. No franchiseeId in the body — requests are
 * salon-scoped. If the submitter IS the salon's assigned State Head, the response's
 * `skippedStateHeadStep` is true and the request starts at PENDING_ADMIN directly.
 */
export async function submitRoyaltyRequest(salonId: string, input: SubmitRoyaltyRequestInput): Promise<RoyaltyRequest> {
  const data = await request<RawRoyaltyRequest>(`/salons/${salonId}/royalty-requests`, {
    method: 'POST',
    body: input,
  });
  return adaptRoyaltyRequest(data);
}

/** GET /api/v1/salons/{salonId}/royalty-requests — plain array, unscoped, no
 * pagination, ordered newest-first. */
export async function listRoyaltyHistory(salonId: string): Promise<RoyaltyRequest[]> {
  const data = await request<RawRoyaltyRequest[]>(`/salons/${salonId}/royalty-requests`);
  return adaptList(data);
}

/** GET /api/v1/royalty-requests/pending — plain array, no pagination. Response set
 * is role-dependent server-side (Admins get PENDING_ADMIN, everyone else gets only
 * their own PENDING_STATE_HEAD) — don't pass a role param. */
export async function listPendingRoyaltyRequests(): Promise<RoyaltyRequest[]> {
  const data = await request<RawRoyaltyRequest[]>('/royalty-requests/pending');
  return adaptList(data);
}

export async function getRoyaltyRequest(id: string): Promise<RoyaltyRequest> {
  const data = await request<RawRoyaltyRequest>(`/royalty-requests/${id}`);
  return adaptRoyaltyRequest(data);
}

/** POST /api/v1/royalty-requests/{id}/state-head-recommendation — body
 * {approved, reason}, reason required for BOTH approve and reject. Advisory only:
 * always routes to PENDING_ADMIN next regardless of approve/reject. */
export async function submitStateHeadRecommendation(id: string, approved: boolean, reason: string): Promise<RoyaltyRequest> {
  const data = await request<RawRoyaltyRequest>(`/royalty-requests/${id}/state-head-recommendation`, {
    method: 'POST',
    body: { approved, reason },
  });
  return adaptRoyaltyRequest(data);
}

/** POST /api/v1/admin/royalty-requests/{id}/decision — body {approved, reason},
 * terminal. No self-review-conflict check exists server-side (confirmed) — don't
 * build a UI block for it. */
export async function submitAdminDecision(id: string, approved: boolean, reason: string): Promise<RoyaltyRequest> {
  const data = await request<RawRoyaltyRequest>(`/admin/royalty-requests/${id}/decision`, {
    method: 'POST',
    body: { approved, reason },
  });
  return adaptRoyaltyRequest(data);
}

export function royaltyStatusBucket(status: RoyaltyOverallStatus): StatusBucket {
  if (status === 'APPROVED') return 'positive';
  if (status === 'REJECTED') return 'negative';
  return 'pending';
}

/** Human label for overallStatus — the sequential pipeline state, not a raw enum dump. */
export function royaltyStatusLabel(status: RoyaltyOverallStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Awaiting State Head';
    case 'PENDING_ADMIN':
      return 'Awaiting Admin';
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
  }
}
