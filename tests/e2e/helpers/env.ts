import { existsSync } from 'node:fs';

/** Central place reading E2E credentials from `.env.test` (git-ignored, real
 * accounts on the local dev backend — see that file for how to populate it). Every
 * consumer goes through here so a missing credential produces one clear skip
 * message instead of a scattered `undefined` crash deep in a test. */

export interface RoleCredentials {
  email: string;
  password: string;
  /** Base32 TOTP secret, if this account already has MFA enrolled and we have it.
   * Only Super Admin plausibly needs this — see helpers/auth.ts. */
  totpSecret?: string;
}

function readRole(prefix: string): RoleCredentials | null {
  const email = process.env[`E2E_${prefix}_EMAIL`];
  const password = process.env[`E2E_${prefix}_PASSWORD`];
  if (!email || !password) return null;
  const totpSecret = process.env[`E2E_${prefix}_TOTP_SECRET`] || undefined;
  return { email, password, totpSecret };
}

export const ROLE_CREDENTIALS = {
  SUPER_ADMIN: readRole('SUPER_ADMIN'),
  CORPORATE_ADMIN: readRole('CORPORATE_ADMIN'),
  STATE_HEAD: readRole('STATE_HEAD'),
  REGIONAL_MANAGER: readRole('REGIONAL_MANAGER'),
  CLUSTER_MANAGER: readRole('CLUSTER_MANAGER'),
} as const;

export type RoleName = keyof typeof ROLE_CREDENTIALS;

export function requireRole(role: RoleName): RoleCredentials {
  const creds = ROLE_CREDENTIALS[role];
  if (!creds) {
    throw new Error(
      `No credentials for ${role} — set E2E_${role}_EMAIL / E2E_${role}_PASSWORD in .env.test to run this test.`,
    );
  }
  return creds;
}

export const ACTIVATION_TOKEN = process.env.E2E_ACTIVATION_TOKEN || undefined;
export const ACTIVATION_EMAIL = process.env.E2E_ACTIVATION_EMAIL || undefined;

export const STORAGE_STATE_DIR = 'playwright/.auth';

export function storageStatePath(role: RoleName): string {
  return `${STORAGE_STATE_DIR}/${role.toLowerCase()}.json`;
}

/** True once global-setup has successfully logged this role in and saved its
 * session. False (rather than throwing) when credentials are missing OR when
 * login itself failed (e.g. an MFA-enrolled account with no known TOTP secret) —
 * either way, dependent specs should skip with a clear reason, not hard-fail on a
 * missing-file error that looks like a crash. */
export function hasStorageState(role: RoleName): boolean {
  return existsSync(storageStatePath(role));
}
