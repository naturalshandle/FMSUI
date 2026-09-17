import { generateSync } from 'otplib';

/** Computes the current 6-digit TOTP code for a base32 secret. Used two ways:
 *  1. First-time enrollment — the app renders the raw secret in plain text on the
 *     MFA setup screen for manual entry, so a test can scrape it straight off the
 *     page and compute a valid code itself, with no pre-shared secret needed.
 *  2. An already-enrolled account — only works if E2E_<ROLE>_TOTP_SECRET was
 *     captured and saved to .env.test the first time that account enrolled. */
export function currentTotpCode(secret: string): string {
  return generateSync({ secret: secret.replace(/\s+/g, '') });
}
