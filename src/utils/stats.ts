import type { Franchisee, SectionName, SectionState } from '@/types';

export interface DashboardStats {
  total: number;
  pendingReview: number;
  onboarded: number;
  needsAction: number;
  totalFirms: number;
  totalSalons: number;
  sectionBreakdown: Record<SectionName, Record<SectionState, number>>;
}

const SECTION_NAMES: SectionName[] = ['FRANCHISEE_INFO', 'RELATIONS', 'FIRMS', 'SALONS'];
const SECTION_STATES: SectionState[] = ['DRAFT', 'SUBMITTED', 'VERIFIED', 'REJECTED'];

export function computeStats(franchisees: Franchisee[]): DashboardStats {
  const sectionBreakdown = {} as DashboardStats['sectionBreakdown'];
  for (const s of SECTION_NAMES) {
    sectionBreakdown[s] = { DRAFT: 0, SUBMITTED: 0, VERIFIED: 0, REJECTED: 0 };
  }

  let pendingReview = 0;
  let onboarded = 0;
  let needsAction = 0;
  let totalFirms = 0;
  let totalSalons = 0;

  for (const f of franchisees) {
    let hasSubmitted = false;
    let hasRejected = false;
    let allVerified = true;

    for (const sec of f.sections) {
      sectionBreakdown[sec.section][sec.status]++;
      if (sec.status === 'SUBMITTED') hasSubmitted = true;
      if (sec.status === 'REJECTED') hasRejected = true;
      if (sec.status !== 'VERIFIED') allVerified = false;
    }

    if (hasSubmitted) pendingReview++;
    if (hasRejected) needsAction++;
    if (f.overallStatus === 'ONBOARDED' || allVerified) onboarded++;

    totalFirms += f.firms.length;
    for (const firm of f.firms) {
      totalSalons += firm.salons.length;
    }
  }

  return {
    total: franchisees.length,
    pendingReview,
    onboarded,
    needsAction,
    totalFirms,
    totalSalons,
    sectionBreakdown,
  };
}

export const sectionLabels: Record<SectionName, string> = {
  FRANCHISEE_INFO: 'Franchisee Info',
  RELATIONS: 'Relations',
  FIRMS: 'Firms',
  SALONS: 'Salons',
};

export const sectionStateLabels: Record<SectionState, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
};

export { SECTION_NAMES, SECTION_STATES };
