import { test, expect, type Page } from '@playwright/test';
import { ROLE_CREDENTIALS, storageStatePath, hasStorageState } from '../helpers/env';
import { testName } from '../helpers/testData';
import { findOfficialRowByName, expectOfficialLinked } from '../helpers/officials';

// Modal.tsx has no role="dialog"/aria-labelledby, and its primary-action button
// text can collide with a same-labelled button on the page behind it (e.g. both
// the "Add Official" trigger and the modal's own submit button read "Add
// Official") — scope to the modal's fixed/z-50 root rather than the whole page.
function modalOf(page: Page) {
  return page.locator('div.fixed.inset-0.z-50');
}

test.describe('Officials — Link User', () => {
  test.skip(
    !hasStorageState('SUPER_ADMIN'),
    'Super Admin session not available — see global-setup output (e.g. MFA-enrolled with no known TOTP secret).',
  );
  test.use({ storageState: storageStatePath('SUPER_ADMIN') });

  test('email search/select links a Regional Manager, filtered to the matching role', async ({ page }) => {
    const rmCreds = ROLE_CREDENTIALS.REGIONAL_MANAGER;
    test.skip(!rmCreds, 'No E2E_REGIONAL_MANAGER_EMAIL/PASSWORD in .env.test — needed as a known role-matching option.');

    const officialName = testName('Regional Official');

    await page.goto('/officials');
    await page.getByRole('button', { name: 'Add Official' }).click();
    const createModal = modalOf(page);
    await createModal.getByLabel('Type').selectOption('REGIONAL_MANAGER');
    await createModal.getByLabel('Name').fill(officialName);
    await createModal.getByRole('button', { name: 'Add Official' }).click();
    await expect(page.getByText(`${officialName} added as an official.`)).toBeVisible({ timeout: 10_000 });

    const row = await findOfficialRowByName(page, officialName, 'REGIONAL_MANAGER');
    await row.getByRole('button', { name: 'Link User' }).click();

    const linkModal = modalOf(page);
    await expect(linkModal.getByText('Attach a login to')).toBeVisible();
    await linkModal.getByRole('button', { name: 'Select by email...' }).click();

    // Role filtering: a known non-Regional-Manager account (this Super Admin's own
    // login) must not appear; the known Regional Manager account must.
    await expect(linkModal.getByRole('button', { name: ROLE_CREDENTIALS.SUPER_ADMIN!.email })).toHaveCount(0);
    const option = linkModal.getByRole('button', { name: rmCreds!.email });
    await expect(option).toBeVisible();
    await option.click();

    await linkModal.getByRole('button', { name: 'Link User' }).click();
    await expect(page.getByText(`Login linked to ${officialName}.`)).toBeVisible({ timeout: 10_000 });

    await expectOfficialLinked(page, officialName, 'REGIONAL_MANAGER');
  });

  test('an Official type with no matching-role users shows a clear message, not an empty dead-end', async ({ page }) => {
    // Cluster Manager credentials are not provisioned in this pass, so — if no
    // Cluster Manager users exist in this dev DB either — this exercises the
    // "no eligible users" empty state deliberately rather than by accident.
    test.skip(!!ROLE_CREDENTIALS.CLUSTER_MANAGER, 'A Cluster Manager account is configured — skipping the empty-state check.');

    const officialName = testName('Cluster Official (no eligible users)');
    await page.goto('/officials');
    await page.getByRole('button', { name: 'Add Official' }).click();
    const createModal = modalOf(page);
    await createModal.getByLabel('Type').selectOption('CLUSTER_MANAGER');
    await createModal.getByLabel('Name').fill(officialName);
    await createModal.getByRole('button', { name: 'Add Official' }).click();
    await expect(page.getByText(`${officialName} added as an official.`)).toBeVisible({ timeout: 10_000 });

    const row = await findOfficialRowByName(page, officialName, 'CLUSTER_MANAGER');
    await row.getByRole('button', { name: 'Link User' }).click();

    await expect(modalOf(page).getByText(/No users hold the Cluster Manager role yet/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});
