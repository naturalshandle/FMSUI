/** Franchise Creation wizard (spec §3) — a resumable, draft/finalize model. Every
 * type here mirrors DraftResponse's literal shape; `currentStep` is a high-water
 * mark (max(current, n)), never a cursor — reaching step N unlocks free
 * back-navigation/re-edit of any step <= N without regressing the mark. */

export type DraftStatus = 'IN_PROGRESS' | 'FINALIZED' | 'ABANDONED';

/** Step 1 request shape — sent to PUT .../step/franchisees. */
export interface FranchiseeOwnerInput {
  name: string;
  dob: string;
  pan: string;
  aadhaar: string;
  contact: string;
  address: string;
}

/** Step 1 as echoed back on the draft — pan/aadhaar are NEVER echoed, only booleans.
 * Re-render owner rows from these booleans, never retain submitted plaintext. */
export interface DraftFranchiseeOwner {
  name: string;
  dob: string;
  contact: string;
  address: string;
  panProvided: boolean;
  aadhaarProvided: boolean;
}

export interface DraftFirmData {
  legalName: string;
  companyType: string;
  gstNumber: string;
  fpCode: string;
}

export interface DraftSalonData {
  code: string;
  laSalonCode: string;
  name: string;
  format: string;
  sqFt: number;
  launchDate: string;
  address: string;
  district: string;
  state: string;
  pincode: string;
  primaryContact: string;
  ratecard: string;
}

export interface DraftOfficialsData {
  clusterHeadOfficialId: string;
  regionalHeadOfficialId: string;
  stateHeadOfficialId: string;
}

export interface DraftAgreementData {
  validFrom: string;
  validTill: string;
  royaltyTerms: string;
}

export type WizardDocumentType = 'PAN_PROOF' | 'AADHAAR_PROOF' | 'GST_CERTIFICATE';

export interface DraftDocumentRecord {
  documentType: WizardDocumentType;
  ownerIndex?: number;
  fileName?: string;
  uploadedAt?: string;
}

export interface FranchiseCreationDraft {
  id: string;
  createdByUserId: string;
  currentStep: number;
  status: DraftStatus;
  /** null (not []) when the franchisees step hasn't been saved yet — same
   * null-until-filled pattern as firmData/salonData/etc below. Every consumer must
   * default to [] before reading .length/.map, never assume it's populated. */
  franchiseeOwners: DraftFranchiseeOwner[] | null;
  firmData: DraftFirmData | null;
  salonData: DraftSalonData | null;
  officialsData: DraftOfficialsData | null;
  agreementData: DraftAgreementData | null;
  documentsData: DraftDocumentRecord[] | null;
  allRequiredDocumentsPresent: boolean;
  finalizedFranchiseeIds: string[] | null;
  finalizedFirmId: string | null;
  finalizedSalonId: string | null;
  finalizedAgreementId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinalizeResult {
  draftId: string;
  franchiseeIds: string[];
  firmId: string;
  salonId: string;
  agreementId: string;
}

export const WIZARD_STEPS = ['franchisees', 'firm', 'salon', 'officials', 'agreement', 'documents'] as const;
export type WizardStepName = (typeof WIZARD_STEPS)[number];

export const WIZARD_STEP_LABELS: Record<WizardStepName, string> = {
  franchisees: 'Franchisee(s)',
  firm: 'Firm',
  salon: 'Salon',
  officials: 'Officials',
  agreement: 'Agreement',
  documents: 'Documents',
};
