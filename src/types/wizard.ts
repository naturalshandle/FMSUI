/**
 * "Add Franchisee" wizard — types for the legacy/real data-entry flow.
 *
 * UNCONFIRMED CONTRACT (except where noted): the backend "Add Franchisee" endpoints
 * (POST /admin/franchisees, POST /admin/firms, POST /admin/firms/{firmId}/salons,
 * GET /admin/franchisees/{id}/completion) could not be verified against real backend
 * source — no backend repo was available in this environment. Most field names below
 * are still a best guess taken from the original prompt, not a confirmed DTO.
 *
 * The firm creation contract (WizardFirmInput / WizardFirm / WizardFirmOwner) is now
 * confirmed against the real `AdminCreateFirmRequest` DTO for
 * POST /api/v1/admin/firms — see the fix that corrected `companyType` → `firmType`
 * and `ownerIds`/`primaryOwnerId` → `owners: { franchiseeId, isPrimary }[]`.
 * Everything else (owner/salon/completion/document shapes) remains unverified.
 * Reconcile against the actual backend source before relying on the rest in production.
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
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  franchiseeType: FranchiseeType;
}

export interface WizardOwner extends WizardOwnerInput {
  id: string;
}

/** Confirmed against AdminCreateFirmRequest — POST /api/v1/admin/firms. */
export type FirmType = 'PROPRIETORSHIP' | 'PARTNERSHIP' | 'PRIVATE_LIMITED' | 'LLP';

export interface WizardFirmOwner {
  franchiseeId: number;
  isPrimary: boolean;
}

export interface WizardFirmInput {
  legalName: string;
  firmType: FirmType;
  gstNumber?: string;
  fpCode?: string;
  owners: WizardFirmOwner[];
}

export interface WizardFirm {
  id: string;
  /** Primary owner's franchisee id, per the confirmed response shape. */
  franchiseeId: string;
  legalName: string;
  firmType: FirmType;
  gstNumber?: string;
  fpCode?: string;
  owners: WizardFirmOwner[];
}

export interface WizardAgreementInput {
  validFrom?: string;
  validTill?: string;
  year?: string;
  renewalYear?: string;
  royaltyTerms?: string;
  status?: string;
}

export interface WizardSalonInput {
  firmId: string;
  salonCode?: string;
  legacyCode?: string;
  salonName: string;
  format?: string;
  sqft?: string;
  launchDate?: string;
  district?: string;
  state?: string;
  pincode?: string;
  addressLine1?: string;
  contact1?: string;
  contact2?: string;
  email?: string;
  ratecard?: string;
  latitude?: string;
  longitude?: string;
  status?: string;
  clusterHead?: string;
  regionalHead?: string;
  stateHead?: string;
  region?: string;
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
