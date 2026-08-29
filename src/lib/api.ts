import type { AdminUser, Firm, Franchisee, Relation, SectionStatus, Salon } from '@/types';

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8080/api/v1';

const ACCESS_TOKEN_KEY = 'fms_access_token';
const REFRESH_TOKEN_KEY = 'fms_refresh_token';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  /** Use this bearer token instead of the stored access token (e.g. a short-lived mfaToken). */
  bearerToken?: string;
}

export async function request<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const { method = 'GET', body, auth = true, bearerToken } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (bearerToken) {
    headers['Authorization'] = `Bearer ${bearerToken}`;
  } else if (auth) {
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the backend running on http://localhost:8080?');
  }

  if (res.status === 401 && auth && !isRetry && path !== '/auth/refresh') {
    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    const refreshed = await refreshPromise;
    if (refreshed) return request<T>(path, options, true);
    clearTokens();
    throw new ApiError(401, 'Session expired. Please log in again.');
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const errorsList = data && Array.isArray(data.errors) ? data.errors.join('; ') : undefined;
    const message =
      (data && (data.message || data.error)) || errorsList || `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export type LoginResult =
  | { status: 'AUTHENTICATED'; tokens: AuthTokens }
  | { status: 'MFA_REQUIRED'; mfaToken: string }
  | { status: 'MFA_SETUP_REQUIRED'; mfaToken: string };

export async function login(email: string, password: string): Promise<LoginResult> {
  const data = await request<{
    requiresMfa?: boolean;
    requiresMfaSetup?: boolean;
    mfaToken?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
  }>('/auth/login', { method: 'POST', body: { email, password }, auth: false });

  if (data.requiresMfa) return { status: 'MFA_REQUIRED', mfaToken: data.mfaToken! };
  if (data.requiresMfaSetup) return { status: 'MFA_SETUP_REQUIRED', mfaToken: data.mfaToken! };
  return {
    status: 'AUTHENTICATED',
    tokens: { accessToken: data.accessToken!, refreshToken: data.refreshToken!, expiresIn: data.expiresIn! },
  };
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return;
  try {
    await request('/auth/logout', { method: 'POST', body: { refreshToken } });
  } catch {
    // best-effort — clear local tokens regardless
  }
}

// ---------------------------------------------------------------------------
// MFA
// ---------------------------------------------------------------------------

export interface MfaSetupInfo {
  secret: string;
  qrCodeUri: string;
}

/** GET /auth/mfa/setup — uses the short-lived mfaToken issued at login (or a normal accessToken for voluntary opt-in). */
export async function getMfaSetup(bearerToken: string): Promise<MfaSetupInfo> {
  return request<MfaSetupInfo>('/auth/mfa/setup', { auth: false, bearerToken });
}

export type EnableMfaResult =
  | { status: 'TOKENS'; tokens: AuthTokens }
  | { status: 'MESSAGE'; message: string };

/**
 * POST /auth/mfa/enable — completes first-time mandatory MFA setup (bearerToken = mfaToken,
 * response carries fresh tokens) or a voluntary opt-in by an already-logged-in user
 * (bearerToken = their normal accessToken, response is just a confirmation message).
 */
export async function enableMfa(bearerToken: string, secret: string, totp: string): Promise<EnableMfaResult> {
  const data = await request<{
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    message?: string;
  }>('/auth/mfa/enable', { method: 'POST', body: { secret, totp }, auth: false, bearerToken });

  if (data.accessToken) {
    return {
      status: 'TOKENS',
      tokens: { accessToken: data.accessToken, refreshToken: data.refreshToken!, expiresIn: data.expiresIn! },
    };
  }
  return { status: 'MESSAGE', message: data.message ?? 'MFA enabled successfully.' };
}

/** POST /auth/mfa/verify — completes login for an account that already has MFA enabled. */
export async function verifyMfa(mfaToken: string, totp: string): Promise<AuthTokens> {
  const data = await request<{ accessToken: string; refreshToken: string; expiresIn: number }>(
    '/auth/mfa/verify',
    { method: 'POST', body: { totp }, auth: false, bearerToken: mfaToken },
  );
  return data;
}

// ---------------------------------------------------------------------------
// Franchisees / Firms / Salons — raw backend shapes + adapters
// ---------------------------------------------------------------------------

interface RawSection {
  sectionName: SectionStatus['section'];
  status: SectionStatus['status'];
  rejectionReason?: string;
  updatedAt?: string;
  updatedBy?: number;
}

interface RawRelation {
  id: number;
  name: string;
  relationType: Relation['relationType'];
  dateOfBirth?: string;
  anniversaryDate?: string;
  phone?: string;
}

interface RawSalon {
  id: number;
  name: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  inaugurationDate?: string;
  currentFirmId: number;
}

interface RawFirm {
  id: number;
  franchiseeId: number;
  name: string;
  firmType: Firm['firmType'];
  gstNumber?: string;
  panNumber?: string;
  bankAccountNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  salons?: RawSalon[];
}

interface RawFranchisee {
  id: number;
  franchiseeType: Franchisee['franchiseeType'];
  panNumber?: string;
  dateOfBirth?: string;
  companyRegistrationNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  relationsConsentGiven: boolean;
  overallStatus: Franchisee['overallStatus'];
  createdAt: string;
  sections?: RawSection[];
  relations?: RawRelation[];
  firms?: RawFirm[];
}

function composeAddress(parts: {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}): string {
  return [parts.addressLine1, parts.addressLine2, parts.city, parts.state, parts.pincode]
    .filter((p) => p && p.trim().length > 0)
    .join(', ');
}

function adaptSection(s: RawSection): SectionStatus {
  return {
    section: s.sectionName,
    status: s.status,
    rejectionReason: s.rejectionReason,
    verifiedBy: s.status === 'VERIFIED' && s.updatedBy != null ? `User #${s.updatedBy}` : undefined,
    verifiedAt: s.status === 'VERIFIED' ? s.updatedAt : undefined,
  };
}

function adaptRelation(r: RawRelation): Relation {
  return {
    id: String(r.id),
    name: r.name,
    relationType: r.relationType,
    dateOfBirth: r.dateOfBirth,
    anniversaryDate: r.anniversaryDate,
    phone: r.phone,
  };
}

function adaptSalon(s: RawSalon): Salon {
  return {
    id: String(s.id),
    salonName: s.name,
    address: composeAddress(s),
    city: s.city,
    currentFirmId: String(s.currentFirmId),
    openingDate: s.inaugurationDate,
  };
}

function adaptFirm(f: RawFirm): Firm {
  return {
    id: String(f.id),
    legalName: f.name,
    firmType: f.firmType,
    gstNumber: f.gstNumber ?? '',
    pan: f.panNumber ?? '',
    bankAccountLast4: f.bankAccountNumber ? f.bankAccountNumber.slice(-4) : '',
    franchiseeId: String(f.franchiseeId),
    salons: (f.salons ?? []).map(adaptSalon),
  };
}

function adaptFranchisee(f: RawFranchisee): Franchisee {
  return {
    id: String(f.id),
    franchiseeType: f.franchiseeType,
    pan: f.panNumber ?? '',
    dateOfBirth: f.dateOfBirth,
    companyRegistrationNumber: f.companyRegistrationNumber,
    addressLine1: f.addressLine1,
    addressLine2: f.addressLine2,
    city: f.city,
    state: f.state,
    pincode: f.pincode,
    country: f.country,
    relationsConsentGiven: f.relationsConsentGiven,
    overallStatus: f.overallStatus,
    createdAt: f.createdAt,
    sections: (f.sections ?? []).map(adaptSection),
    relations: (f.relations ?? []).map(adaptRelation),
    firms: (f.firms ?? []).map(adaptFirm),
  };
}

export async function listFranchisees(
  params: { sectionStatus?: string; page?: number; size?: number } = {},
): Promise<Franchisee[]> {
  const qs = new URLSearchParams();
  if (params.sectionStatus) qs.set('sectionStatus', params.sectionStatus);
  qs.set('page', String(params.page ?? 0));
  qs.set('size', String(params.size ?? 200));
  const data = await request<{ content: RawFranchisee[] }>(`/franchisees?${qs.toString()}`);
  return data.content.map(adaptFranchisee);
}

export async function getFranchisee(id: string): Promise<Franchisee> {
  const data = await request<RawFranchisee>(`/franchisees/${id}`);
  return adaptFranchisee(data);
}

export async function verifySection(franchiseeId: string, section: string): Promise<void> {
  await request(`/franchisees/${franchiseeId}/sections/${section}/verify`, { method: 'POST' });
}

export async function rejectSection(franchiseeId: string, section: string, rejectionReason: string): Promise<void> {
  await request(`/franchisees/${franchiseeId}/sections/${section}/reject`, {
    method: 'POST',
    body: { rejectionReason },
  });
}

export async function transferFirmOwnership(
  firmId: string,
  newFranchiseeId: string,
  reason: string,
): Promise<void> {
  await request(`/firms/${firmId}/transfer-ownership`, {
    method: 'POST',
    body: {
      newFranchiseeId: Number(newFranchiseeId),
      transferDate: new Date().toISOString().slice(0, 10),
      reason,
    },
  });
}

export async function transferSalonFirm(salonId: string, newFirmId: string, reason: string): Promise<void> {
  await request(`/salons/${salonId}/transfer-firm`, {
    method: 'POST',
    body: {
      newFirmId: Number(newFirmId),
      transferDate: new Date().toISOString().slice(0, 10),
      reason,
    },
  });
}

// ---------------------------------------------------------------------------
// Admin users
// ---------------------------------------------------------------------------

interface RawUserResponse {
  id: number;
  email: string;
  fullName: string;
  phoneNumber?: string;
  status: string;
  mfaEnabled: boolean;
  roles: string[];
}

export async function createAdminUser(input: {
  fullName: string;
  email: string;
  phoneNumber?: string;
  roleNames: string[];
}): Promise<AdminUser> {
  const data = await request<RawUserResponse>('/admin/users', {
    method: 'POST',
    body: {
      fullName: input.fullName,
      email: input.email,
      phoneNumber: input.phoneNumber,
      roleNames: input.roleNames,
    },
  });
  return {
    id: String(data.id),
    fullName: data.fullName,
    email: data.email,
    phoneNumber: data.phoneNumber,
    status: data.status,
    mfaEnabled: data.mfaEnabled,
    roles: data.roles,
  };
}
