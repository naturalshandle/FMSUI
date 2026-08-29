/**
 * "Add Franchisee" wizard — types for the admin data-entry flow.
 *
 * Field names below are aligned to the confirmed request DTOs in
 * docs/FMSBE_postman_collection.json (POST /admin/franchisees, POST /admin/firms,
 * POST /admin/salons, POST /admin/salons/{salonId}/agreements). Response shapes for
 * these endpoints are not verified live — adapters in wizardApi.ts fall back to the
 * submitted input when a field is absent from the response.
 */

export type FranchiseeType = 'INDIVIDUAL' | 'COMPANY';

export interface WizardOwnerInput {
  prefix?: string;
  fullName: string;
  contact: string;
  dateOfBirth?: string;
  email?: string;
  pan: string;
  aadhaar?: string;
  address?: string;
  franchiseeType: FranchiseeType;
}

export interface WizardOwner extends WizardOwnerInput {
  id: string;
}

export type CompanyType = 'PROPRIETORSHIP' | 'PARTNERSHIP' | 'PRIVATE_LIMITED' | 'LLP';

export interface WizardFirmOwner {
  franchiseeId: number;
  isPrimary: boolean;
}

export interface WizardFirmInput {
  legalName: string;
  companyType: CompanyType;
  gstNumber?: string;
  fpCode?: string;
  owners: WizardFirmOwner[];
}

export interface WizardFirm {
  id: string;
  /** Primary owner's franchisee id. */
  franchiseeId: string;
  legalName: string;
  companyType: CompanyType;
  gstNumber?: string;
  fpCode?: string;
  owners: WizardFirmOwner[];
}

export interface WizardAgreementInput {
  validFrom: string;
  validTill: string;
  contractYear?: number;
  renewalYear?: number;
  royaltyTerms?: string;
}

export interface WizardSalonInput {
  firmId: string;
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
  agreement?: WizardAgreementInput;
}

export interface WizardSalon extends WizardSalonInput {
  id: string;
}

export interface WizardCompletion {
  completionPercentage: number;
}

export type WizardDocumentType =
  | 'OWNER_ID_PROOF'
  | 'FIRM_GST_CERTIFICATE'
  | 'SALON_AGREEMENT';

export type WizardDocumentEntity = 'FRANCHISEE' | 'FIRM' | 'SALON';
