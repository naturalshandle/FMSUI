/** Real backend enum (FranchiseeOverallStatus) — DRAFT = nothing submitted yet, SUBMITTED = awaiting admin review, ONBOARDED = fully verified. There is no INCOMPLETE value. */
export type FranchiseeOverallStatus = 'DRAFT' | 'SUBMITTED' | 'ONBOARDED';

/**
 * Field names confirmed live against GET /api/v1/franchisees/{id} — `pan` (not
 * `panNumber`) and a single flat `address` string (not addressLine1/city/state/pincode,
 * and not a nested object). There is no full Aadhaar on the wire, only `aadhaarLast4`.
 */
export interface Franchisee {
  id: string;
  franchiseeType: 'INDIVIDUAL' | 'COMPANY';
  pan: string;
  dateOfBirth?: string;
  companyRegistrationNumber?: string;
  address?: string;
  relationsConsentGiven: boolean;
  overallStatus: FranchiseeOverallStatus;
  createdAt: string;
  sections: SectionStatus[];
  relations: Relation[];
  firms: Firm[];
}

/**
 * Admin franchisee directory row — GET /api/v1/admin/franchisees returns
 * FranchiseeSummaryResponse, confirmed against backend source to be exactly:
 * id, fullName, franchiseeType, overallStatus, source, firmCount, salonCount, createdAt.
 * There is no `pan` field on this response — do not add one here without a matching
 * backend change (fetching it per-row via GET /franchisees/{id} would be an N+1).
 */
export interface FranchiseeSummary {
  id: string;
  fullName?: string;
  franchiseeType?: 'INDIVIDUAL' | 'COMPANY';
  overallStatus?: FranchiseeOverallStatus;
  source?: string;
  firmCount?: number;
  salonCount?: number;
  createdAt?: string;
}

export interface SectionStatus {
  section: 'FRANCHISEE_INFO' | 'RELATIONS' | 'FIRMS' | 'SALONS';
  status: 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
  rejectionReason?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface Relation {
  id: string;
  name: string;
  /**
   * Free text on the wire (@NotBlank, max 30 chars) — the backend has no RelationType
   * enum and doesn't validate against a fixed list. Keep this a plain string; a curated
   * picker in the UI is fine, but the type must not close off values the backend accepts.
   */
  relationType: string;
  dateOfBirth?: string;
  anniversaryDate?: string;
  phone?: string;
}

export type CompanyType = 'PROPRIETORSHIP' | 'PARTNERSHIP' | 'PRIVATE_LIMITED' | 'LLP';

export interface FirmOwner {
  franchiseeId: string;
  /** Not guaranteed present on GET /firms/:id — filled in when the backend includes it. */
  franchiseeName?: string;
  isPrimary: boolean;
}

export interface Firm {
  id: string;
  legalName: string;
  companyType: CompanyType;
  gstNumber: string;
  fpCode?: string;
  pan?: string;
  bankAccountLast4?: string;
  owners: FirmOwner[];
  salons: Salon[];
}

export type SalonFormat = 'UNISEX' | 'LADIES' | 'GENTS' | string;
export type OperationalStatus = 'ACTIVE' | 'INACTIVE' | 'UNDER_RENOVATION' | 'CLOSED' | string;

export interface Salon {
  id: string;
  firmId: string;
  salonCode?: string;
  legacyCode?: string;
  salonName: string;
  salonFormat?: SalonFormat;
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
  operationalStatus?: OperationalStatus;
  clusterHeadId?: string;
  regionalHeadId?: string;
  stateHeadId?: string;
  /** Kept for backward-compat display; prefer district/state. */
  city?: string;
  openingDate?: string;
  currentFirmId: string;
  /**
   * Not part of SalonResponse — confirmed absent from every salon GET/list/create/update
   * endpoint. The entity column exists but nothing serializes it; the frontend derives
   * "current royalty %" from the salon's own /royalty-history instead (see SalonDetail.tsx).
   */
}

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
}

/**
 * GET /api/v1/officials/me/salons(/{salonId}) — confirmed a DELIBERATELY different,
 * smaller shape than SalonResponse (used by /admin/salons/*, /salons/*): nested
 * firm/owners instead of raw *HeadId fields, and no currentFirmId. `owners[]` is
 * intentionally redacted to just fullName/isPrimary — no PAN, Aadhaar, DOB, address,
 * or contact for the owner anywhere in this response. Do not reuse the plain `Salon`
 * type for this, and never add owner PII fields here to "fill it in" — that data
 * doesn't exist on this endpoint by design.
 */
export interface SalonForOfficial {
  id: string;
  salonCode: string;
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
  operationalStatus: 'ACTIVE' | 'UNDER_RENOVATION' | 'CLOSED';
  currentRoyaltyPercentage: number | null;
  createdAt: string;
  updatedAt: string;
  firm: {
    id: string;
    legalName: string;
    companyType: 'PROPRIETORSHIP' | 'PRIVATE_LIMITED' | 'LLP';
    gstNumber?: string;
  } | null;
  owners: Array<{ fullName: string | null; isPrimary: boolean }>;
}

export type AgreementStatus = 'ACTIVE' | 'SUPERSEDED' | 'TERMINATED' | string;

export interface Agreement {
  id: string;
  salonId: string;
  validFrom: string;
  validTill: string;
  contractYear?: number;
  renewalYear?: number;
  royaltyTerms?: string;
  status?: AgreementStatus;
  createdAt?: string;
}

/** GET /api/v1/admin/dashboard — response shape unverified; consumed defensively. */
export interface DashboardData {
  totalFranchisees?: number;
  pendingReview?: number;
  onboarded?: number;
  needsAction?: number;
  totalFirms?: number;
  totalSalons?: number;
  totalOfficials?: number;
  sectionBreakdown?: Record<string, Record<string, number>>;
  [key: string]: unknown;
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  status: string;
  mfaEnabled: boolean;
  roles: string[];
}

export interface CurrentUser {
  userId: string;
  email: string;
  roles: string[];
}

export type SectionName = SectionStatus['section'];
export type SectionState = SectionStatus['status'];

export type RoyaltyDecisionState = 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * Confirmed against FMSBE backend source directly — response is IDs-only, no
 * salonName/franchiseeName/requestedByName field exists on the wire. Components
 * resolve display names from data they already have (salon context, a loaded
 * Officials list, etc.) rather than a field that doesn't exist. A request needs
 * BOTH stateHeadDecision and adminDecision to be APPROVED before overallStatus
 * flips to APPROVED and the salon's actual currentRoyaltyPercentage updates —
 * either tier rejecting closes the request as REJECTED immediately regardless of
 * the other tier's state. Each tier's decision is one-shot: re-deciding an
 * already-decided tier, or a request whose overallStatus is no longer PENDING,
 * gets a 409 from the backend.
 */
export interface RoyaltyRequest {
  id: string;
  salonId: string;
  franchiseeId: string;
  /** null only if the salon had never had a royalty % set before this request. */
  currentPercentage: number | null;
  newPercentage: number;
  reason: string;
  instructedBy?: string;
  /** User id of the requester — resolve a display name client-side if needed. */
  requestedBy: string;
  overallStatus: RoyaltyDecisionState;
  stateHeadDecision: RoyaltyDecisionState;
  stateHeadDecidedBy?: string;
  stateHeadDecidedAt?: string;
  stateHeadReason?: string;
  adminDecision: RoyaltyDecisionState;
  adminDecidedBy?: string;
  adminDecidedAt?: string;
  adminReason?: string;
  createdAt: string;
  updatedAt: string;
}
