import { test, expect } from '@playwright/test';
import { ACTIVATION_TOKEN, ACTIVATION_EMAIL } from '../helpers/env';
import { currentTotpCode } from '../helpers/totp';

/**
 * Item 2 — Account activation → auto-login → (MFA enrollment) → dashboard.
 *
 * NOT auto-runnable end to end: the activation token only exists inside a real
 * invitation email, and this repo has no mail-catcher (MailHog/etc.) to fetch it
 * from programmatically. Per explicit decision, this spec stays skipped unless a
 * human pastes a freshly-issued token (and the email it was sent to) into
 * E2E_ACTIVATION_TOKEN / E2E_ACTIVATION_EMAIL in .env.test before running it —
 * tokens are almost certainly single-use and short-lived, so this only ever
 * exercises one real run per token, not repeatable CI coverage.
 */
test.describe('Account activation', () => {
  test('a real activation token completes activate → auto-login → dashboard (or MFA setup)', async ({ page }) => {
    test.skip(!ACTIVATION_TOKEN || !ACTIVATION_EMAIL, 'No E2E_ACTIVATION_TOKEN/EMAIL in .env.test — see spec header.');

    const password = `PwTest-${Date.now()}!`;
    await page.goto(`/activate?token=${encodeURIComponent(ACTIVATION_TOKEN!)}&email=${encodeURIComponent(ACTIVATION_EMAIL!)}`);

    await expect(page.getByRole('heading', { name: 'Activate your account' })).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveValue(ACTIVATION_EMAIL!);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm password').fill(password);
    await page.getByRole('button', { name: 'Activate account' }).click();

    const outcome = await Promise.race([
      page.waitForURL('/', { timeout: 20_000 }).then(() => 'home' as const),
      page.waitForURL('**/mfa/verify', { timeout: 20_000 }).then(() => 'mfa' as const),
    ]);

    if (outcome === 'home') {
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
      return;
    }

    // MFA-required role: activation should have chained straight into the MFA
    // flow without asking for the password again anywhere in this run.
    await page.getByLabel('Verification code').fill('000000');
    await page.getByRole('button', { name: 'Verify' }).click();
    await page.waitForURL('**/mfa/setup', { timeout: 10_000 });

    const secret = (await page.locator('button.font-mono span.truncate').first().textContent())?.trim();
    expect(secret, 'MFA setup screen did not render a secret').toBeTruthy();

    await page.getByLabel('Verification code').fill(currentTotpCode(secret!));
    await page.getByRole('button', { name: 'Enable MFA' }).click();
    await expect(page.getByRole('button', { name: 'Verify' })).toBeVisible({ timeout: 15_000 });
    await page.getByLabel('Verification code').fill(currentTotpCode(secret!));
    await page.getByRole('button', { name: 'Verify' }).click();

    await expect(page).toHaveURL('/', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('a missing token shows a clear invalid-link state, not a broken form', async ({ page }) => {
    await page.goto('/activate');
    await expect(page.getByText(/invalid or incomplete/i)).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveCount(0);
  });

  test('an invalid/expired token is rejected with a clear message on submit', async ({ page }) => {
    await page.goto('/activate?token=obviously-bogus-token&email=nobody%40example.com');
    await page.getByLabel('Password', { exact: true }).fill('SomePassword123!');
    await page.getByLabel('Confirm password').fill('SomePassword123!');
    await page.getByRole('button', { name: 'Activate account' }).click();

    await expect(page.getByText(/invalid or expired activation token/i)).toBeVisible({ timeout: 10_000 });
    // Must stay on the activation form, not silently redirect anywhere.
    await expect(page).toHaveURL(/\/activate/);
  });
});
