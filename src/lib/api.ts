import type { AdminUser, DashboardData, Franchisee, FranchiseeSummary, Relation, SectionStatus, Firm, Salon } from '@/types';

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8080/api/v1';

const REFRESH_TOKEN_KEY = 'fms_refresh_token';

// The access token lives in memory only — never in localStorage/sessionStorage —
// so it can't be read by an XSS payload that persists across a full page reload.
// It's lost on reload by design; restoreSession() below re-derives it from the
// refresh token (the only credential kept in localStorage).
let accessTokenMem: string | null = null;

export function getAccessToken(): string | null {
  return accessTokenMem;
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  accessTokenMem = accessToken;
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  accessTokenMem = null;
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

/**
 * Re-derives an in-memory access token from the persisted refresh token on
 * app load (page reload/new tab), since the access token itself is never
 * persisted. Returns true if a valid session was restored.
 */
export function restoreSession(): Promise<boolean> {
  if (!getRefreshToken()) return Promise.resolve(false);
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

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

/** POST /auth/forgot-password — always 200 with a generic message; never reveal whether the email exists. */
export async function forgotPassword(email: string): Promise<void> {
  await request('/auth/forgot-password', { method: 'POST', body: { email }, auth: false });
}

/** POST /auth/reset-password — completes a reset started via forgotPassword's emailed link. */
export async function resetPassword(token: string, password: string): Promise<void> {
  await request('/auth/reset-password', { method: 'POST', body: { token, password }, auth: false });
}

/**
 * POST /auth/activate — sets the initial password for an account created via
 * POST /admin/users or POST /admin/franchisees. The activation token arrives out-of-band (email).
 */
export async function activateAccount(token: string, password: string): Promise<void> {
  await request('/auth/activate', { method: 'POST', body: { token, password }, auth: false });
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
 * Per the Postman collection the code field is `code`, not `totp`.
 */
export async function enableMfa(bearerToken: string, secret: string, code: string): Promise<EnableMfaResult> {
  const data = await request<{
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    message?: string;
  }>('/auth/mfa/enable', { method: 'POST', body: { secret, code }, auth: false, bearerToken });

  if (data.accessToken) {
    return {
      status: 'TOKENS',
      tokens: { accessToken: data.accessToken, refreshToken: data.refreshToken!, expiresIn: data.expiresIn! },
    };
  }
  return { status: 'MESSAGE', message: data.message ?? 'MFA enabled successfully.' };
}

/**
 * POST /auth/mfa/verify — completes login for an account that already has MFA enabled.
 * Per the Postman collection, the mfaToken travels in the JSON body as `mfaToken`
 * (not as a bearer token), alongside the `code` field.
 */
export async function verifyMfa(mfaToken: string, code: string): Promise<AuthTokens> {
  const data = await request<{ accessToken: string; refreshToken: string; expiresIn: number }>(
    '/auth/mfa/verify',
    { method: 'POST', body: { mfaToken, code }, auth: false },
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
  firmId?: number;
  currentFirmId?: number;
  salonCode?: string;
  legacyCode?: string;
  salonName?: string;
  name?: string;
  salonFormat?: string;
  squareFootage?: number;
  launchDate?: string;
  inaugurationDate?: string;
  address?: string;
  addressLine1?: string;
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
  city?: string;
}

interface RawFirmOwner {
  franchiseeId: number;
  franchiseeName?: string;
  isPrimary: boolean;
}

interface RawFirm {
  id: number;
  franchiseeId?: number;
  name?: string;
  legalName?: string;
  companyType?: Firm['companyType'];
  firmType?: Firm['companyType'];
  gstNumber?: string;
  fpCode?: string;
  panNumber?: string;
  bankAccountNumber?: string;
  owners?: RawFirmOwner[];
  salons?: RawSalon[];
}

/** Confirmed live against GET /api/v1/franchisees/{id} — pan and address are flat scalar fields. */
interface RawFranchisee {
  id: number;
  franchiseeType: Franchisee['franchiseeType'];
  pan?: string;
  dateOfBirth?: string;
  companyRegistrationNumber?: string;
  address?: string;
  relationsConsentGiven: boolean;
  overallStatus: Franchisee['overallStatus'];
  createdAt: string;
  sections?: RawSection[];
  relations?: RawRelation[];
  firms?: RawFirm[];
}

function composeAddress(parts: {
  addressLine1?: string;
  address?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
}): string {
  return [parts.addressLine1 ?? parts.address, parts.addressLine2, parts.city ?? parts.district, parts.state, parts.pincode]
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

export function adaptSalon(s: RawSalon): Salon {
  const firmId = s.firmId ?? s.currentFirmId;
  return {
    id: String(s.id),
    firmId: firmId != null ? String(firmId) : '',
    currentFirmId: firmId != null ? String(firmId) : '',
    salonCode: s.salonCode,
    legacyCode: s.legacyCode,
    salonName: s.salonName ?? s.name ?? '',
    salonFormat: s.salonFormat,
    squareFootage: s.squareFootage,
    launchDate: s.launchDate ?? s.inaugurationDate,
    openingDate: s.launchDate ?? s.inaugurationDate,
    address: composeAddress(s),
    district: s.district,
    state: s.state,
    pincode: s.pincode,
    region: s.region,
    contactNumber1: s.contactNumber1,
    contactNumber2: s.contactNumber2,
    email: s.email,
    ratecard: s.ratecard,
    latitude: s.latitude,
    longitude: s.longitude,
    operationalStatus: s.operationalStatus,
    clusterHeadId: s.clusterHeadId != null ? String(s.clusterHeadId) : undefined,
    regionalHeadId: s.regionalHeadId != null ? String(s.regionalHeadId) : undefined,
    stateHeadId: s.stateHeadId != null ? String(s.stateHeadId) : undefined,
    city: s.city ?? s.district,
  };
}

export function adaptFirm(f: RawFirm): Firm {
  const owners: Firm['owners'] = f.owners?.length
    ? f.owners.map((o) => ({
        franchiseeId: String(o.franchiseeId),
        franchiseeName: o.franchiseeName,
        isPrimary: o.isPrimary,
      }))
    : f.franchiseeId != null
      ? [{ franchiseeId: String(f.franchiseeId), isPrimary: true }]
      : [];
  return {
    id: String(f.id),
    legalName: f.legalName ?? f.name ?? '',
    companyType: (f.companyType ?? f.firmType ?? 'PROPRIETORSHIP') as Firm['companyType'],
    gstNumber: f.gstNumber ?? '',
    fpCode: f.fpCode,
    pan: f.panNumber ?? '',
    bankAccountLast4: f.bankAccountNumber ? f.bankAccountNumber.slice(-4) : '',
    owners,
    salons: (f.salons ?? []).map(adaptSalon),
  };
}

function adaptFranchisee(f: RawFranchisee): Franchisee {
  return {
    id: String(f.id),
    franchiseeType: f.franchiseeType,
    pan: f.pan ?? '',
    dateOfBirth: f.dateOfBirth,
    companyRegistrationNumber: f.companyRegistrationNumber,
    address: f.address,
    relationsConsentGiven: f.relationsConsentGiven,
    overallStatus: f.overallStatus,
    createdAt: f.createdAt,
    sections: (f.sections ?? []).map(adaptSection),
    relations: (f.relations ?? []).map(adaptRelation),
    firms: (f.firms ?? []).map(adaptFirm),
  };
}

/**
 * GET /api/v1/admin/franchisees/:id — admin-scoped detail fetch, unrestricted by
 * caller-ownership (unlike GET /franchisees/:id, which is the self-service endpoint
 * and 403s unless franchisee.userId matches the caller). This app's /franchisee/:id
 * route is only ever reached from admin surfaces (Review Queue, Firm owner links,
 * post-create redirect), so it must always use the admin endpoint.
 */
export async function getFranchisee(id: string): Promise<Franchisee> {
  const data = await request<RawFranchisee>(`/admin/franchisees/${id}`);
  return adaptFranchisee(data);
}

/** POST /api/v1/admin/franchisees/:id/sections/:section/verify (moved under /admin in this backend version). */
export async function verifySection(franchiseeId: string, section: string): Promise<void> {
  await request(`/admin/franchisees/${franchiseeId}/sections/${section}/verify`, { method: 'POST' });
}

/** POST /api/v1/admin/franchisees/:id/sections/:section/reject — body field is `reason`. */
export async function rejectSection(franchiseeId: string, section: string, reason: string): Promise<void> {
  await request(`/admin/franchisees/${franchiseeId}/sections/${section}/reject`, {
    method: 'POST',
    body: { reason },
  });
}

// ---------------------------------------------------------------------------
// Admin — Franchisee directory + dashboard
// ---------------------------------------------------------------------------

export interface FranchiseeDirectoryParams {
  status?: string;
  source?: string;
  search?: string;
  sortBy?: string;
  direction?: 'ASC' | 'DESC';
  page?: number;
  size?: number;
}

export interface FranchiseeDirectoryPage {
  content: FranchiseeSummary[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

/**
 * GET /api/v1/admin/franchisees — list response shape not verified live.
 * We accept either a Spring-style Page<> envelope ({content, totalElements, ...})
 * or a bare array, and adapt each row defensively since the exact summary DTO
 * field names (fullName vs name, firmCount, etc.) are unconfirmed.
 */
export async function listFranchiseesAdmin(params: FranchiseeDirectoryParams = {}): Promise<FranchiseeDirectoryPage> {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.source) qs.set('source', params.source);
  if (params.search) qs.set('search', params.search);
  if (params.sortBy) qs.set('sortBy', params.sortBy);
  if (params.direction) qs.set('direction', params.direction);
  qs.set('page', String(params.page ?? 0));
  qs.set('size', String(params.size ?? 20));

  const data = await request<unknown>(`/admin/franchisees?${qs.toString()}`);
  const raw = data as Record<string, unknown>;
  const contentArr: Record<string, unknown>[] = Array.isArray(data)
    ? (data as Record<string, unknown>[])
    : (Array.isArray(raw?.content) ? (raw.content as Record<string, unknown>[]) : []);

  const content: FranchiseeSummary[] = contentArr.map((r) => ({
    id: String(r.id ?? r.franchiseeId ?? ''),
    fullName: (r.fullName as string) ?? (r.name as string) ?? undefined,
    franchiseeType: r.franchiseeType as FranchiseeSummary['franchiseeType'],
    overallStatus: r.overallStatus as FranchiseeSummary['overallStatus'],
    source: r.source as string | undefined,
    firmCount: (r.firmCount as number) ?? (Array.isArray(r.firms) ? (r.firms as unknown[]).length : undefined),
    salonCount: r.salonCount as number | undefined,
    createdAt: r.createdAt as string | undefined,
  }));

  return {
    content,
    totalElements: (raw?.totalElements as number) ?? content.length,
    totalPages: (raw?.totalPages as number) ?? 1,
    page: (raw?.number as number) ?? (raw?.page as number) ?? (params.page ?? 0),
    size: (raw?.size as number) ?? (params.size ?? 20),
  };
}

/** GET /api/v1/admin/dashboard — response shape unverified; returned as-is for the page to consume defensively. */
export async function getDashboard(): Promise<DashboardData> {
  return request<DashboardData>('/admin/dashboard');
}

export interface UpcomingImportantDate {
  [key: string]: unknown;
}

export async function getUpcomingImportantDates(withinDays = 30): Promise<UpcomingImportantDate[]> {
  const data = await request<unknown>(`/admin/important-dates/upcoming?withinDays=${withinDays}`);
  return Array.isArray(data) ? (data as UpcomingImportantDate[]) : [];
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

/** POST /api/v1/admin/users — roleName is a single string, not an array. */
export async function createAdminUser(input: {
  fullName: string;
  email: string;
  phone?: string;
  roleName: string;
}): Promise<AdminUser> {
  const data = await request<RawUserResponse>('/admin/users', {
    method: 'POST',
    body: {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      roleName: input.roleName,
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
