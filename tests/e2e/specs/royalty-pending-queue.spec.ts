import { test, expect } from '@playwright/test';
import { storageStatePath, hasStorageState } from '../helpers/env';

/**
 * Item 5 — Royalty pending queue. The prompt this suite was built from claimed a
 * "403 that was just fixed today" here, but nothing in this repo's git history or
 * working tree touches royalty code — per explicit direction, this test asserts
 * REAL current behavior and reports a 403 as a live bug if one still occurs, rather
 * than assuming the claimed fix exists.
 */
test.describe('Royalty pending queue', () => {
  test.skip(
    !hasStorageState('SUPER_ADMIN'),
    'Super Admin session not available — see global-setup output (e.g. MFA-enrolled with no known TOTP secret).',
  );
  test.use({ storageState: storageStatePath('SUPER_ADMIN') });

  test('a Super Admin can load the pending-decision queue without a 403', async ({ page }) => {
    const failedResponses: string[] = [];
    page.on('response', (res) => {
      if (res.url().includes('/royalty-requests/pending') && !res.ok()) {
        failedResponses.push(`${res.status()} ${res.url()}`);
      }
    });

    await page.goto('/royalty-approvals');

    await expect(page.getByRole('heading', { name: 'Pending Your Decision' })).toBeVisible({ timeout: 15_000 });
    expect(failedResponses, 'GET /royalty-requests/pending failed').toEqual([]);

    // Either real pending items render, or the explicit empty state does — either
    // is a pass; what fails the test is neither showing up (a silent broken state).
    const emptyState = page.getByText('Nothing pending your review right now');
    const anyRequestRow = page.locator('table tbody tr, [data-royalty-request]');
    await expect(emptyState.or(anyRequestRow.first())).toBeVisible({ timeout: 15_000 });
  });
});
