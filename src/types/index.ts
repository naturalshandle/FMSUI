export interface Franchisee {
  id: string;
  franchiseeType: 'INDIVIDUAL' | 'COMPANY';
  pan: string;
  dateOfBirth?: string;
  companyRegistrationNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  relationsConsentGiven: boolean;
  overallStatus: 'INCOMPLETE' | 'ONBOARDED';
  createdAt: string;
  sections: SectionStatus[];
  relations: Relation[];
  firms: Firm[];
}

/**
 * Admin franchisee directory row — GET /api/v1/admin/franchisees.
 * Response shape not verified live; kept intentionally loose (see adminApi.ts adapter)
 * with graceful fallbacks so the Directory table renders regardless of exact field names.
 */
export interface FranchiseeSummary {
  id: string;
  fullName?: string;
  franchiseeType?: 'INDIVIDUAL' | 'COMPANY';
  pan?: string;
  contact?: string;
  email?: string;
  status?: string;
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
  relationType: 'SPOUSE' | 'CHILD' | 'PARENT' | 'SIBLING' | 'EMERGENCY_CONTACT' | 'OTHER';
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
