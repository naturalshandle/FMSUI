import type { AdminUser, Firm } from '@/types';
import { extractErrorMessage } from '@/lib/errors';

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
  /** Additional headers merged in as-is — e.g. X-Step-Up-Token for sensitive-info
   * endpoints (spec §0.2.8), which travels separately from Authorization. */
  extraHeaders?: Record<string, string>;
}

export async function request<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const { method = 'GET', body, auth = true, bearerToken, extraHeaders } = options;
  const headers: Record<string, string> = { ...extraHeaders };
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
    throw new ApiError(res.status, extractErrorMessage(res.status, data));
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  mustChangePassword: boolean;
}

export type LoginResult =
  | { status: 'AUTHENTICATED'; tokens: AuthTokens }
  | { status: 'MFA_REQUIRED'; mfaToken: string };

/** POST /auth/login — spec §1. Login never itself signals "needs MFA setup"; that
 * is only ever discovered via a 409 from /auth/mfa/verify (see verifyMfa below). */
export async function login(email: string, password: string): Promise<LoginResult> {
  const data = await request<{
    mfaRequired: boolean;
    mfaToken?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenType?: string;
    expiresInSeconds?: number;
    mustChangePassword?: boolean;
  }>('/auth/login', { method: 'POST', body: { email, password }, auth: false });

  if (data.mfaRequired) return { status: 'MFA_REQUIRED', mfaToken: data.mfaToken! };
  return {
    status: 'AUTHENTICATED',
    tokens: {
      accessToken: data.accessToken!,
      refreshToken: data.refreshToken!,
      expiresInSeconds: data.expiresInSeconds!,
      mustChangePassword: data.mustChangePassword ?? false,
    },
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

/** POST /auth/reset-password — completes a reset started via forgotPassword's emailed link. Also
 * revokes every other active session for the user. */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await request('/auth/reset-password', { method: 'POST', body: { token, newPassword }, auth: false });
}

/** POST /auth/activate — sets the initial password for an account created via
 * POST /admin/users. Token+email arrive out-of-band via the invitation email link. */
export async function activateAccount(token: string, email: string, newPassword: string): Promise<void> {
  await request('/auth/activate', { method: 'POST', body: { token, email, newPassword }, auth: false });
}

/** POST /auth/change-password — the mandatory in-session interstitial when the access
 * token carries mustChangePassword=true (also usable for a voluntary change). Lives
 * under the always-exempt /auth/** prefix, so it's reachable even with that flag set.
 * Revokes every other outstanding session on success, same as resetPassword. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await request('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } });
}

// ---------------------------------------------------------------------------
// MFA
// ---------------------------------------------------------------------------

export interface MfaSetupInfo {
  secret: string;
  otpAuthUri: string;
}

/** GET /auth/mfa/setup — Bearer = the short-lived mfaToken issued at login, or a
 * normal accessToken for voluntary opt-in. */
export async function getMfaSetup(bearerToken: string): Promise<MfaSetupInfo> {
  return request<MfaSetupInfo>('/auth/mfa/setup', { auth: false, bearerToken });
}

/** POST /auth/mfa/enable — body is `{code}` only. Success just confirms MFA is now
 * enabled; it does NOT return tokens. Per spec §0.2.4, the caller must loop back to
 * verifyMfa() with a freshly-entered code to actually complete login. */
export async function enableMfa(bearerToken: string, code: string): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/mfa/enable', {
    method: 'POST',
    body: { code },
    auth: false,
    bearerToken,
  });
}

/**
 * POST /auth/mfa/verify — completes login for an account with MFA already enabled.
 * mfaToken travels in the JSON body (not as a bearer token). A 409 with message
 * "MFA setup has not been completed for this account yet" means the account is
 * enrolled-but-not-enabled — the UI's job is to catch that ApiError and redirect to
 * the MFA Setup screen with the same mfaToken, not to show it as a failure.
 */
export async function verifyMfa(mfaToken: string, code: string): Promise<AuthTokens> {
  const data = await request<{
    accessToken: string;
    refreshToken: string;
    expiresInSeconds: number;
    mustChangePassword?: boolean;
  }>('/auth/mfa/verify', { method: 'POST', body: { mfaToken, code }, auth: false });
  return { ...data, mustChangePassword: data.mustChangePassword ?? false };
}

// ---------------------------------------------------------------------------
// Firms — raw backend shape + adapter (Salon's adapter lives in salonsApi.ts —
// its spec shape is flat and needs no shared helper)
// ---------------------------------------------------------------------------

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
  owners?: RawFirmOwner[];
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
    owners,
  };
}

// ---------------------------------------------------------------------------
// Admin users
// ---------------------------------------------------------------------------

interface RawUserResponse {
  id: number;
  email: string;
  roleName: string;
}

/** POST /api/v1/admin/users — body is just {email, roleName} per spec §2. */
export async function createAdminUser(input: { email: string; roleName: string }): Promise<AdminUser> {
  const data = await request<RawUserResponse>('/admin/users', {
    method: 'POST',
    body: { email: input.email, roleName: input.roleName },
  });
  return { id: String(data.id), email: data.email, roleName: data.roleName };
}
