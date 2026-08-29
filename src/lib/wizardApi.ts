/**
 * "Add Franchisee" wizard — API calls for the admin data-entry flow.
 *
 * Owner/firm/salon creation paths and field names are aligned to
 * docs/FMSBE_postman_collection.json (POST /admin/franchisees, POST /admin/firms,
 * POST /admin/salons — this wizard is an admin tool, so salon creation goes through
 * the admin endpoint with firmId in the body, not the self-service nested-URL variant).
 * Response shapes for these three endpoints are not verified live; adapters fall back
 * to the submitted input for any field missing from the response.
 */
import { request } from '@/lib/api';
import type {
  WizardCompletion,
  WizardFirm,
  WizardFirmInput,
  WizardOwner,
  WizardOwnerInput,
  WizardSalon,
  WizardSalonInput,
} from '@/types/wizard';

interface RawWizardOwner {
  id: number;
}

interface RawWizardFirmResponse {
  id: number;
  franchiseeId?: number;
  legalName?: string;
  name?: string;
  companyType?: WizardFirmInput['companyType'];
  gstNumber?: string;
  fpCode?: string;
  owners?: WizardFirmInput['owners'];
}

interface RawWizardSalon {
  id: number;
}

export async function createWizardOwner(input: WizardOwnerInput): Promise<WizardOwner> {
  const data = await request<RawWizardOwner>('/admin/franchisees', {
    method: 'POST',
    body: { ...input, userId: null },
  });
  return { ...input, id: String(data.id) };
}

export async function createWizardFirm(input: WizardFirmInput): Promise<WizardFirm> {
  const data = await request<RawWizardFirmResponse>('/admin/firms', { method: 'POST', body: input });
  const primaryOwner = input.owners.find((o) => o.isPrimary) ?? input.owners[0];
  return {
    id: String(data.id),
    franchiseeId: data.franchiseeId != null ? String(data.franchiseeId) : String(primaryOwner?.franchiseeId ?? ''),
    legalName: data.legalName ?? data.name ?? input.legalName,
    companyType: data.companyType ?? input.companyType,
    gstNumber: data.gstNumber ?? input.gstNumber,
    fpCode: data.fpCode ?? input.fpCode,
    owners: data.owners ?? input.owners,
  };
}

export async function createWizardSalon(input: WizardSalonInput): Promise<WizardSalon> {
  const { firmId, ...rest } = input;
  const data = await request<RawWizardSalon>('/admin/salons', {
    method: 'POST',
    body: { firmId: Number(firmId), ...rest },
  });
  return { ...input, id: String(data.id) };
}

export async function getWizardCompletion(franchiseeId: string): Promise<WizardCompletion> {
  return request<WizardCompletion>(`/admin/franchisees/${franchiseeId}/completion`);
}
