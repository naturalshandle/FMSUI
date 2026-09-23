/**
 * Franchisee is a flat identity record per spec §4 — no lifecycle/KYC status, no
 * nested relations or firms (those concepts don't exist in this backend contract).
 * PAN/Aadhaar are masked-by-default (last4 only); full values are only ever
 * fetched via the step-up-gated admin reveal endpoint (see franchiseesApi.ts) and
 * must never be retained in this shape.
 */
export interface Franchisee {
  id: string;
  name: string;
  dob?: string;
  panLast4?: string;
  aadhaarLast4?: string;
  contact?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CompanyType = 'PROPRIETORSHIP' | 'PARTNERSHIP' | 'PRIVATE_LIMITED' | 'LLP' | string;

export interface FirmOwner {
  franchiseeId: string;
  /** Not guaranteed present on GET /firms/:id — filled in when the backend includes it. */
  franchiseeName?: string;
  isPrimary: boolean;
}

/** GET /api/v1/firms/{id} per spec §4 — no nested `salons` array exists on this
 * response, and the spec defines no "list salons by firm" endpoint either (a Salon
 * only points at its firm via currentFirmId, one-directionally). Don't invent one. */
export interface Firm {
  id: string;
  legalName: string;
  companyType: CompanyType;
  gstNumber: string;
  fpCode?: string;
  owners: FirmOwner[];
}

export type OperationalStatus = 'ACTIVE' | 'INACTIVE' | 'CLOSED';

/** GET /api/v1/salons/{id} per spec §5 — literal field names. No firm field (transfer
 * is its own endpoint) and no official-head-id-mutation via PATCH. `format` is free
 * text (no fixed enum given by the backend, unlike `operationalStatus`). */
export interface Salon {
  id: string;
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
  operationalStatus?: OperationalStatus;
  currentFirmId?: string;
  clusterHeadOfficialId?: string;
  regionalHeadOfficialId?: string;
  stateHeadOfficialId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Backend UserStatus enum. LOCKED/DISABLED exist on the enum but aren't reachable
 * from the officials/admin-users flows today — treat as unstyled fallbacks, not bugs. */
export type UserAccountStatus = 'PENDING_ACTIVATION' | 'ACTIVE' | 'LOCKED' | 'DISABLED';

/** Admin - Officials. Backend enum values for officialType are unconfirmed beyond the CLUSTER_MANAGER example in the Postman collection. */
export type OfficialType = 'CLUSTER_MANAGER' | 'REGIONAL_MANAGER' | 'STATE_HEAD' | string;

export interface Official {
  id: string;
  officialType: OfficialType;
  name: string;
  contact: string;
  email?: string;
  region?: string;
  userId?: string | null;
  /** Linked user's activation status — null/undefined when no user is linked. */
  status?: UserAccountStatus | null;
}

export type AgreementStatus = 'ACTIVE' | 'SUPERSEDED' | 'TERMINATED';

/** GET /api/v1/agreements/{id} per spec §6. `isExpired` is computed server-side —
 * only ever true for status=ACTIVE with a parseable past validTill. Always show it
 * as a separate tag alongside the status badge, never collapsed into one value. */
export interface Agreement {
  id: string;
  salonId: string;
  validFrom: string;
  validTill: string;
  royaltyTerms?: string;
  status: AgreementStatus;
  statusReason?: string;
  isExpired: boolean;
  createdAt?: string;
}

/** GET /api/v1/dashboard per spec §9 — NOT under /admin, unscoped, identical for
 * every staff role + admin. `expired` inside agreementsByStatus is a computed
 * bucket (still-ACTIVE agreements past validTill), paired with — never replacing
 * — the real `active` count. */
export interface DashboardData {
  totalFranchisees: number;
  totalFirms: number;
  totalSalons: number;
  agreementsByStatus: {
    active: number;
    expired: number;
    terminated: number;
    superseded: number;
  };
  royaltyRequestsByStatus: {
    pendingStateHead: number;
    pendingAdmin: number;
    approved: number;
    rejected: number;
  };
  documentsByVerificationStatus: {
    pending: number;
    verified: number;
    rejected: number;
  };
  franchiseCreationDraftsInProgress: number;
}

/** POST /api/v1/admin/users and GET /api/v1/admin/users response — spec §2. */
export interface AdminUser {
  id: string;
  email: string;
  roleName: string;
  status: UserAccountStatus;
}

export interface CurrentUser {
  userId: string;
  email: string;
  roles: string[];
}

export type RoyaltyType = 'VARIABLE' | 'FIXED' | 'ANNUALLY';

/** Server-computed State Head step state — render the step from this, never from the
 * raw stateHeadRecommendation. */
export type RoyaltyStateHeadStatus = 'PENDING' | 'SKIPPED' | 'APPROVED' | 'REJECTED';

export type RoyaltyOverallStatus = 'PENDING_STATE_HEAD' | 'PENDING_ADMIN' | 'APPROVED' | 'REJECTED';

/**
 * RM/CM submits -> PENDING_STATE_HEAD; State Head submits -> PENDING_ADMIN with
 * skippedStateHeadStep. The State Head's recommendation is advisory: it always moves
 * the request to PENDING_ADMIN, approve or reject. Only Admin closes a request
 * (APPROVED/REJECTED, final), and may do so while it is still PENDING_STATE_HEAD —
 * an override, flagged by adminOverrodeStateHead.
 *
 * currentValue/currentRoyaltyType are server-snapshotted history fields, never sent
 * by the client; null means "no terms recorded yet". newValue is a percentage for
 * VARIABLE and a rupee amount for FIXED/ANNUALLY.
 */
export interface RoyaltyRequest {
  id: string;
  salonId: string;
  salonName?: string;
  currentValue: number | null;
  newValue: number;
  currentRoyaltyType: RoyaltyType | null;
  newRoyaltyType: RoyaltyType;
  reason: string;
  instructedBy?: string;
  /** User id of the requester — resolve a display name client-side if needed. */
  requestedBy: string;
  skippedStateHeadStep: boolean;
  stateHeadStatus: RoyaltyStateHeadStatus;
  stateHeadRecommendation?: string;
  stateHeadReason?: string;
  stateHeadDecidedBy?: string;
  stateHeadDecidedAt?: string;
  adminDecision?: 'APPROVED' | 'REJECTED';
  adminReason?: string;
  adminDecidedBy?: string;
  adminDecidedAt?: string;
  adminOverrodeStateHead: boolean;
  overallStatus: RoyaltyOverallStatus;
  createdAt: string;
  updatedAt: string;
}
