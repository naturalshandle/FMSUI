import { request } from '@/lib/api';
import type { RoyaltyOverallStatus, RoyaltyRequest, RoyaltyStateHeadStatus, RoyaltyType } from '@/types';
import type { StatusBucket } from '@/components/ui/StatusBadge';

/** Timestamps are ISO-8601 UTC; nullable fields are null (not absent) until set. */
interface RawRoyaltyRequest {
  id: number;
  salonId: number;
  salonName?: string | null;
  currentValue: number | null;
  newValue: number;
  currentRoyaltyType: RoyaltyType | null;
  newRoyaltyType: RoyaltyType;
  reason: string;
  instructedBy: string | null;
  requestedBy: number;
  skippedStateHeadStep: boolean;
  stateHeadStatus: RoyaltyStateHeadStatus;
  stateHeadRecommendation: string | null;
  stateHeadReason: string | null;
  stateHeadDecidedBy: number | null;
  stateHeadDecidedAt: string | null;
  adminDecision: 'APPROVED' | 'REJECTED' | null;
  adminReason: string | null;
  adminDecidedBy: number | null;
  adminDecidedAt: string | null;
  adminOverrodeStateHead: boolean;
  overallStatus: RoyaltyOverallStatus;
  createdAt: string;
  updatedAt: string;
}

function adaptRoyaltyRequest(r: RawRoyaltyRequest): RoyaltyRequest {
  return {
    id: String(r.id),
    salonId: String(r.salonId),
    salonName: r.salonName ?? undefined,
    currentValue: r.currentValue ?? null,
    newValue: r.newValue,
    currentRoyaltyType: r.currentRoyaltyType ?? null,
    newRoyaltyType: r.newRoyaltyType,
    reason: r.reason,
    instructedBy: r.instructedBy ?? undefined,
    requestedBy: String(r.requestedBy),
    skippedStateHeadStep: !!r.skippedStateHeadStep,
    stateHeadStatus: r.stateHeadStatus,
    stateHeadRecommendation: r.stateHeadRecommendation ?? undefined,
    stateHeadReason: r.stateHeadReason ?? undefined,
    stateHeadDecidedBy: r.stateHeadDecidedBy != null ? String(r.stateHeadDecidedBy) : undefined,
    stateHeadDecidedAt: r.stateHeadDecidedAt ?? undefined,
    adminDecision: r.adminDecision ?? undefined,
    adminReason: r.adminReason ?? undefined,
    adminDecidedBy: r.adminDecidedBy != null ? String(r.adminDecidedBy) : undefined,
    adminDecidedAt: r.adminDecidedAt ?? undefined,
    adminOverrodeStateHead: !!r.adminOverrodeStateHead,
    overallStatus: r.overallStatus,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function adaptList(data: RawRoyaltyRequest[]): RoyaltyRequest[] {
  return data.map(adaptRoyaltyRequest);
}

// ---- Type-dependent value rules ----------------------------------------------------

export const ROYALTY_TYPES: readonly RoyaltyType[] = ['VARIABLE', 'FIXED', 'ANNUALLY'];

export const royaltyTypeLabels: Record<RoyaltyType, string> = {
  VARIABLE: 'Variable (percentage)',
  FIXED: 'Fixed (rupee amount)',
  ANNUALLY: 'Annually (rupee amount)',
};

/** VARIABLE is a percentage; FIXED and ANNUALLY are rupee amounts. */
export function isPercentageType(type: RoyaltyType | null | undefined): boolean {
  return type === 'VARIABLE';
}

export function royaltyValueLabel(type: RoyaltyType | ''): string {
  if (type === 'VARIABLE') return 'New royalty (%)';
  if (type === 'FIXED' || type === 'ANNUALLY') return 'New royalty amount (₹)';
  return 'New royalty value';
}

export function royaltyValueSuffix(type: RoyaltyType | ''): string {
  if (type === 'VARIABLE') return '%';
  if (type === 'FIXED' || type === 'ANNUALLY') return '₹';
  return '';
}

/** Client-side mirror of the server rules. Returns null when valid. Raw text is
 * validated (not a parsed number) so "" and "abc" can't slip through as 0/NaN. */
export function validateRoyaltyValue(raw: string, type: RoyaltyType | ''): string | null {
  if (!type) return 'Select a royalty type.';
  if (!raw.trim()) return 'A value is required.';
  const n = Number(raw);
  if (!Number.isFinite(n)) return 'Enter a valid number.';
  if (type === 'VARIABLE') {
    return n >= 0 && n <= 100 ? null : 'Percentage must be between 0 and 100.';
  }
  return n > 0 ? null : 'Amount must be greater than 0.';
}

/** "—" for the null "no terms recorded yet" history state. */
export function formatRoyaltyValue(value: number | null | undefined, type: RoyaltyType | null | undefined): string {
  if (value == null) return '—';
  if (isPercentageType(type)) return `${value}%`;
  if (type === 'FIXED' || type === 'ANNUALLY') return `₹${value.toLocaleString('en-IN')}`;
  return String(value);
}

export function formatRoyaltyType(type: RoyaltyType | null | undefined): string {
  if (!type) return '—';
  return type === 'VARIABLE' ? 'Variable' : type === 'FIXED' ? 'Fixed' : 'Annually';
}

// ---- Endpoints ---------------------------------------------------------------------

export interface SubmitRoyaltyRequestInput {
  /** Sent as a JSON number, never a string. */
  newValue: number;
  newRoyaltyType: RoyaltyType;
  reason: string;
  instructedBy?: string | null;
}

/**
 * POST /api/v1/salons/{salonId}/royalty-requests — only the RM/CM/SH assigned to that
 * salon; 403 otherwise. The body carries no salonId, so it is path-scoped. If the
 * submitter is the salon's State Head the response has `skippedStateHeadStep: true`
 * and the request starts at PENDING_ADMIN. currentValue/currentRoyaltyType are
 * server-snapshotted and must not be sent.
 */
export async function submitRoyaltyRequest(salonId: string, input: SubmitRoyaltyRequestInput): Promise<RoyaltyRequest> {
  const data = await request<RawRoyaltyRequest>(`/salons/${salonId}/royalty-requests`, {
    method: 'POST',
    body: {
      newValue: input.newValue,
      newRoyaltyType: input.newRoyaltyType,
      reason: input.reason,
      instructedBy: input.instructedBy ?? null,
    },
  });
  return adaptRoyaltyRequest(data);
}

/** GET /api/v1/salons/{salonId}/royalty-requests — plain array, newest first. All
 * five staff roles can read it, not only assigned officials. */
export async function listRoyaltyHistory(salonId: string): Promise<RoyaltyRequest[]> {
  const data = await request<RawRoyaltyRequest[]>(`/salons/${salonId}/royalty-requests`);
  return adaptList(data);
}

/** GET /api/v1/royalty-requests/pending — plain array. Server-scoped by role: Admin
 * gets every PENDING_STATE_HEAD + PENDING_ADMIN; State Head gets PENDING_STATE_HEAD on
 * their salons; RM/CM get their own requests. Don't pass a role param. */
export async function listPendingRoyaltyRequests(): Promise<RoyaltyRequest[]> {
  const data = await request<RawRoyaltyRequest[]>('/royalty-requests/pending');
  return adaptList(data);
}

/** POST /api/v1/royalty-requests/{id}/state-head-recommendation — reason required for
 * BOTH approve and reject. Advisory: always moves the request to PENDING_ADMIN. 409 if
 * the request is no longer PENDING_STATE_HEAD (e.g. an Admin overrode it). */
export async function submitStateHeadRecommendation(id: string, approved: boolean, reason: string): Promise<RoyaltyRequest> {
  const data = await request<RawRoyaltyRequest>(`/royalty-requests/${id}/state-head-recommendation`, {
    method: 'POST',
    body: { approved, reason },
  });
  return adaptRoyaltyRequest(data);
}

/** POST /api/v1/admin/royalty-requests/{id}/decision — Admin roles only, final. Works
 * on PENDING_STATE_HEAD too (override, `adminOverrodeStateHead=true`). Approval
 * overwrites the salon's live royalty value and type. 409 if already decided. */
export async function submitAdminDecision(id: string, approved: boolean, reason: string): Promise<RoyaltyRequest> {
  const data = await request<RawRoyaltyRequest>(`/admin/royalty-requests/${id}/decision`, {
    method: 'POST',
    body: { approved, reason },
  });
  return adaptRoyaltyRequest(data);
}

export const ROYALTY_APPROVED_MESSAGE = "Approved. The salon's royalty terms have been updated.";

// ---- Status presentation -----------------------------------------------------------

export function royaltyStatusBucket(status: RoyaltyOverallStatus): StatusBucket {
  if (status === 'APPROVED') return 'positive';
  if (status === 'REJECTED') return 'negative';
  return 'pending';
}

/** Human label for overallStatus — the pipeline state, not a raw enum dump. */
export function royaltyStatusLabel(status: RoyaltyOverallStatus): string {
  switch (status) {
    case 'PENDING_STATE_HEAD':
      return 'Awaiting State Head';
    case 'PENDING_ADMIN':
      return 'Awaiting Admin';
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
  }
}
