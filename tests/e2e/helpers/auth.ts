import { expect, type Page } from '@playwright/test';
import type { RoleCredentials } from './env';
import { currentTotpCode } from './totp';

export type LoginOutcome =
  | { kind: 'authenticated' }
  | { kind: 'mfa-enrolled-and-verified' }
  | { kind: 'mfa-not-enrolled-and-verified'; secret: string };

/**
 * Drives the real UI through login and, if the account requires MFA, through
 * whichever of setup/verify actually applies — mirroring exactly what a human does,
 * never calling the API directly. Two MFA cases, both handled without a pre-shared
 * secret where possible:
 *
 *  - Not yet enrolled: the app shows the raw TOTP secret in plain text on the setup
 *    screen (for manual entry into an authenticator app) — this fn scrapes it and
 *    computes valid codes itself, so no secret needs to be known ahead of time.
 *  - Already enrolled: there is no way to discover a valid code without knowing the
 *    secret already. If `creds.totpSecret` isn't set, this throws a clear error
 *    telling the caller which env var to fill in, rather than the test failing on
 *    a confusing "Incorrect code" toast.
 */
export async function login(page: Page, creds: RoleCredentials): Promise<LoginOutcome> {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(creds.email);
  await page.getByLabel('Password').fill(creds.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  const result = await Promise.race([
    page.waitForURL('/', { timeout: 15_000 }).then(() => 'home' as const),
    page.waitForURL('**/mfa/verify', { timeout: 15_000 }).then(() => 'mfa' as const),
  ]);

  if (result === 'home') {
    return { kind: 'authenticated' };
  }

  return completeMfa(page, creds);
}

async function completeMfa(page: Page, creds: RoleCredentials): Promise<LoginOutcome> {
  if (creds.totpSecret) {
    await page.getByLabel('Verification code').fill(currentTotpCode(creds.totpSecret));
    await page.getByRole('button', { name: 'Verify' }).click();
    await expect(page).toHaveURL('/', { timeout: 15_000 });
    return { kind: 'mfa-enrolled-and-verified' };
  }

  // No known secret — probe enrollment state with a syntactically-valid but
  // arbitrary code. The backend distinguishes "not enrolled" (409 → app redirects
  // to /mfa/setup) from "enrolled, wrong code" (401 → stays on /mfa/verify) without
  // needing the real code either way.
  await page.getByLabel('Verification code').fill('000000');
  await page.getByRole('button', { name: 'Verify' }).click();

  const probed = await Promise.race([
    page.waitForURL('**/mfa/setup', { timeout: 10_000 }).then(() => 'setup' as const),
    page
      .getByText('Incorrect code. Please try again.')
      .waitFor({ timeout: 10_000 })
      .then(() => 'already-enrolled' as const),
  ]);

  if (probed === 'already-enrolled') {
    throw new Error(
      `${creds.email} already has MFA enrolled and no TOTP secret is configured for it — ` +
        `set the matching E2E_*_TOTP_SECRET in .env.test (captured once from the MFA setup screen) to test this account's login.`,
    );
  }

  // Not enrolled yet — the setup screen shows the raw secret in a copy-to-clipboard
  // button (`<span class="truncate">{secret}</span>`) for manual entry; scrape it
  // instead of requiring it to be known ahead of time.
  await expect(page.locator('img[alt="Scan this QR code with your authenticator app"]')).toBeVisible({
    timeout: 15_000,
  });
  const secret = (await page.locator('button.font-mono span.truncate').first().textContent())?.trim();
  if (!secret) throw new Error('MFA setup screen did not render a secret to scrape.');

  await page.getByLabel('Verification code').fill(currentTotpCode(secret));
  await page.getByRole('button', { name: 'Enable MFA' }).click();

  // Phase flips to "verify" on the same screen — a fresh code is required.
  await expect(page.getByRole('button', { name: 'Verify' })).toBeVisible({ timeout: 15_000 });
  await page.getByLabel('Verification code').fill(currentTotpCode(secret));
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page).toHaveURL('/', { timeout: 15_000 });

  return { kind: 'mfa-not-enrolled-and-verified', secret };
}
