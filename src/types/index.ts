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

export interface Firm {
  id: string;
  legalName: string;
  firmType: 'PROPRIETORSHIP' | 'PARTNERSHIP' | 'PRIVATE_LIMITED' | 'LLP';
  gstNumber: string;
  pan: string;
  bankAccountLast4: string;
  franchiseeId: string;
  salons: Salon[];
}

export interface Salon {
  id: string;
  salonName: string;
  address: string;
  city?: string;
  currentFirmId: string;
  openingDate?: string;
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
