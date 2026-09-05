import { request } from '@/lib/api';
import type { RoyaltyDecisionState, RoyaltyRequest } from '@/types';

/**
 * Confirmed against FMSBE backend source directly (not the Postman collection, which
 * doesn't cover this module). Response is IDs-only — no salonName/franchiseeName/
 * requestedByName on the wire; components resolve display names from data they
 * already have (salon context, loaded Officials list, etc.) rather than guessing a
 * field that doesn't exist.
 */
interface RawRoyaltyRequest {
  id: number;
  salonId: number;
  franchiseeId: number;
  currentPercentage: number | null;
  newPercentage: number;
  reason: string;
  instructedBy: string | null;
  requestedBy: number;
  overallStatus: RoyaltyDecisionState;
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
    franchiseeId: String(r.franchiseeId),
    currentPercentage: r.currentPercentage,
    newPercentage: r.newPercentage,
    reason: r.reason,
    instructedBy: r.instructedBy ?? undefined,
    requestedBy: String(r.requestedBy),
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

function adaptList(data: unknown): RoyaltyRequest[] {
  const arr = Array.isArray(data)
    ? (data as RawRoyaltyRequest[])
    : ((data as { content?: RawRoyaltyRequest[] })?.content ?? []);
  return arr.map(adaptRoyaltyRequest);
}

export interface CreateRoyaltyRequestInput {
  salonId: string;
  franchiseeId: string;
  newPercentage: number;
  reason: string;
  instructedBy?: string;
}

/**
 * POST /api/v1/royalty-requests — REGIONAL_MANAGER/CLUSTER_MANAGER only; 403s if the
 * caller isn't the assigned RM/CM for this salon. No currentPercentage field is sent —
 * the backend snapshots it server-side from the salon's live value at submit time.
 */
export async function createRoyaltyRequest(input: CreateRoyaltyRequestInput): Promise<RoyaltyRequest> {
  const data = await request<RawRoyaltyRequest>('/royalty-requests', {
    method: 'POST',
    body: {
      salonId: Number(input.salonId),
      franchiseeId: Number(input.franchiseeId),
      newPercentage: input.newPercentage,
      reason: input.reason,
      instructedBy: input.instructedBy || undefined,
    },
  });
  return adaptRoyaltyRequest(data);
}

/**
 * GET /api/v1/salons/:salonId/royalty-history — full audit trail for one salon, newest
 * first, including rejected/resolved requests. Allowed for admins, the salon's assigned
 * RM/CM, or its assigned State Head.
 */
export async function listRoyaltyHistory(salonId: string): Promise<RoyaltyRequest[]> {
  const data = await request<unknown>(`/salons/${salonId}/royalty-history`);
  return adaptList(data);
}

/**
 * GET /api/v1/royalty-requests/pending — NOT under /admin/**; this endpoint must serve
 * STATE_HEAD callers too, and /admin/** is blanket-gated to SUPER_ADMIN/CORPORATE_ADMIN
 * only. Pre-scoped server-side to the caller's own outstanding decisions. Standard
 * Spring Page<> params apply.
 */
export async function listPendingRoyaltyApprovals(page = 0, size = 20): Promise<RoyaltyRequest[]> {
  const data = await request<unknown>(`/royalty-requests/pending?page=${page}&size=${size}`);
  return adaptList(data);
}

export async function getRoyaltyRequest(id: string): Promise<RoyaltyRequest> {
  const data = await request<RawRoyaltyRequest>(`/royalty-requests/${id}`);
  return adaptRoyaltyRequest(data);
}

export type RoyaltyDeciderRole = 'STATE_HEAD' | 'ADMIN';

/**
 * POST /api/v1/royalty-requests/:id/state-head-decision (STATE_HEAD, must be the
 * salon's assigned State Head) or .../admin-decision (SUPER_ADMIN/CORPORATE_ADMIN) —
 * same body shape either way: { approved, reason }. `reason` is required by the
 * backend (400) when approved is false; optional otherwise. Each tier's decision is a
 * one-shot: re-deciding an already-decided tier, or deciding a request whose
 * overallStatus is no longer PENDING, gets a 409.
 */
export async function decideRoyaltyRequest(
  id: string,
  deciderRole: RoyaltyDeciderRole,
  approved: boolean,
  reason?: string,
): Promise<RoyaltyRequest> {
  const path =
    deciderRole === 'STATE_HEAD'
      ? `/royalty-requests/${id}/state-head-decision`
      : `/royalty-requests/${id}/admin-decision`;
  const data = await request<RawRoyaltyRequest>(path, {
    method: 'POST',
    body: { approved, reason: reason || undefined },
  });
  return adaptRoyaltyRequest(data);
}

export function royaltyStatusBadgeKind(status: RoyaltyDecisionState): 'VERIFIED' | 'SUBMITTED' | 'REJECTED' {
  if (status === 'APPROVED') return 'VERIFIED';
  if (status === 'REJECTED') return 'REJECTED';
  return 'SUBMITTED';
}
