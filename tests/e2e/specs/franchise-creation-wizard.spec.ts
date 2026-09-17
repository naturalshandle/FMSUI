import { test, expect, type Locator, type Page } from '@playwright/test';
import { storageStatePath, hasStorageState } from '../helpers/env';
import { testName, testTag, testDigits } from '../helpers/testData';

async function selectFirstAvailableOption(select: Locator, fieldLabel: string) {
  const count = await select.locator('option').count();
  if (count <= 1) {
    throw new Error(
      `Officials step: no ${fieldLabel} option is available besides the placeholder — no Official of that type ` +
        `exists in this dev DB yet. Create one via Officials → Add Official before running this test.`,
    );
  }
  const value = await select.locator('option').nth(1).getAttribute('value');
  await select.selectOption(value!);
}

// A minimal valid 1x1 PNG — small enough to stay well under the 10MB limit, real
// enough for the browser/backend to accept as an image upload.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

async function uploadDoc(page: Page, label: string, filename: string) {
  await page.getByLabel(label).setInputFiles({ name: filename, mimeType: 'image/png', buffer: TINY_PNG });
}

test.describe('Franchise Creation wizard', () => {
  test.skip(
    !hasStorageState('SUPER_ADMIN'),
    'Super Admin session not available — see global-setup output (e.g. MFA-enrolled with no known TOTP secret).',
  );
  test.use({ storageState: storageStatePath('SUPER_ADMIN') });

  test('rejects a Franchisee step submit with missing required fields', async ({ page }) => {
    await page.goto('/franchise-creation/new');
    await expect(page).toHaveURL(/\/franchise-creation\/\d+/, { timeout: 15_000 });

    await page.getByRole('button', { name: 'Save & Continue' }).click();
    await expect(page.getByText('Required').first()).toBeVisible();
    // Still on step 1 — a rejected submit must not silently advance.
    await expect(page.getByRole('button', { name: /^1\. Franchisee/ })).toHaveClass(/from-brand-600/);
  });

  test('forward-gating blocks jumping ahead to an unfinished step', async ({ page }) => {
    await page.goto('/franchise-creation/new');
    await expect(page).toHaveURL(/\/franchise-creation\/\d+/, { timeout: 15_000 });

    const firmTab = page.getByRole('button', { name: /^2\. Firm/ });
    await expect(firmTab).toBeDisabled();
    await expect(firmTab).toHaveAttribute('title', 'Complete previous steps first');

    const reviewTab = page.getByRole('button', { name: 'Review & Finalize' });
    await expect(reviewTab).toBeDisabled();
  });

  test('completes all 6 steps in order, allows backward editing, uploads documents, and finalizes into real records', async ({
    page,
  }) => {
    const tag = testTag();
    const digits = testDigits();
    const ownerName = testName(`Owner ${tag}`);
    const legalName = testName(`Legal Firm ${tag}`);
    const salonName = testName(`Salon ${tag}`);

    await page.goto('/franchise-creation/new');
    await expect(page).toHaveURL(/\/franchise-creation\/(\d+)/, { timeout: 15_000 });
    const draftId = (await page.url()).match(/\/franchise-creation\/(\d+)/)?.[1];
    expect(draftId, 'wizard did not land on a draft id').toBeTruthy();

    // --- Step 1: Franchisee(s) ---
    await page.getByLabel('Name').fill(ownerName);
    await page.getByLabel('Date of birth').fill('1990-01-01');
    await page.getByLabel('PAN').fill('ABCDE1234F');
    await page.getByLabel('Aadhaar').fill('123456789012');
    await page.getByLabel('Contact').fill('9876543210');
    await page.getByLabel('Address').fill('123 Test Street, Test City');
    await page.getByRole('button', { name: 'Save & Continue' }).click();
    await expect(page.getByText('Franchisee(s) saved.')).toBeVisible({ timeout: 10_000 });

    // --- Step 2: Firm ---
    await expect(page.getByRole('button', { name: /^2\. Firm/ })).toHaveClass(/from-brand-600/);
    await page.getByLabel('Legal Name').fill(legalName);
    await page.getByLabel('Company Type').selectOption('PROPRIETORSHIP');
    await page.getByLabel('GST Number').fill(digits);
    await page.getByLabel('FP Code').fill(digits.slice(0, 6));
    await page.getByRole('button', { name: 'Save & Continue' }).click();
    await expect(page.getByText('Firm saved.')).toBeVisible({ timeout: 10_000 });

    // --- Step 3: Salon ---
    await expect(page.getByRole('button', { name: /^3\. Salon/ })).toHaveClass(/from-brand-600/);
    await page.getByLabel('Salon Code').fill(digits);
    await page.getByLabel('LA Salon Code').fill(digits.slice(0, 5));
    await page.getByLabel('Name').fill(salonName);
    await page.getByLabel('Format').fill('UNISEX');
    await page.getByLabel('Square Footage').fill('1000');
    await page.getByLabel('Launch Date').fill('2026-01-01');
    await page.getByLabel('District').fill('Test District');
    await page.getByLabel('State').fill('Test State');
    await page.getByLabel('Pincode').fill('600001');
    await page.getByLabel('Primary Contact').fill('9876543210');
    await page.getByLabel('Address').fill('456 Salon Road');
    await page.getByRole('button', { name: 'Save & Continue' }).click();
    await expect(page.getByText('Salon saved.')).toBeVisible({ timeout: 10_000 });

    // --- Step 4: Officials ---
    await expect(page.getByRole('button', { name: /^4\. Officials/ })).toHaveClass(/from-brand-600/);
    await expect(page.getByText('Loading officials...')).toHaveCount(0, { timeout: 10_000 });
    await selectFirstAvailableOption(page.getByLabel('Cluster Head'), 'Cluster Head');
    await selectFirstAvailableOption(page.getByLabel('Regional Head'), 'Regional Head');
    await selectFirstAvailableOption(page.getByLabel('State Head'), 'State Head');
    await page.getByRole('button', { name: 'Save & Continue' }).click();
    await expect(page.getByText('Officials saved.')).toBeVisible({ timeout: 10_000 });

    // --- Step 5: Agreement ---
    await expect(page.getByRole('button', { name: /^5\. Agreement/ })).toHaveClass(/from-brand-600/);
    await page.getByLabel('Valid From').fill('2026-01-01');
    await page.getByLabel('Valid Till').fill('2027-01-01');
    await page.getByLabel('Royalty Terms').fill('20% on gross, monthly settlement.');
    await page.getByRole('button', { name: 'Save & Continue' }).click();
    await expect(page.getByText('Agreement saved.')).toBeVisible({ timeout: 10_000 });

    // --- Backward edit: go back to step 1, confirm prefill + PAN/Aadhaar redaction ---
    await page.getByRole('button', { name: /^1\. Franchisee/ }).click();
    await expect(page.getByLabel('Name')).toHaveValue(ownerName);
    await expect(page.getByLabel('PAN')).toHaveValue('');
    await expect(page.getByLabel('Aadhaar')).toHaveValue('');
    const editedAddress = '789 Edited Street, Test City';
    await page.getByLabel('Address').fill(editedAddress);
    // PAN/Aadhaar are never echoed back and must be re-entered to re-save this step.
    await page.getByLabel('PAN').fill('ABCDE1234F');
    await page.getByLabel('Aadhaar').fill('123456789012');
    await page.getByRole('button', { name: 'Save & Continue' }).click();
    await expect(page.getByText('Franchisee(s) saved.')).toBeVisible({ timeout: 10_000 });

    // Editing step 1 must not regress the high-water mark — later steps stay unlocked.
    await expect(page.getByRole('button', { name: /^6\. Documents/ })).toBeEnabled();
    await page.getByRole('button', { name: /^6\. Documents/ }).click();

    // --- Step 6: Documents ---
    await uploadDoc(page, 'GST Certificate', 'gst-cert.png');
    await expect(page.getByText('Document uploaded.')).toBeVisible({ timeout: 10_000 });
    await uploadDoc(page, 'PAN Proof', 'pan-proof.png');
    await expect(page.getByText('Document uploaded.')).toBeVisible({ timeout: 10_000 });
    await uploadDoc(page, 'Aadhaar Proof', 'aadhaar-proof.png');
    await expect(page.getByText('Document uploaded.')).toBeVisible({ timeout: 10_000 });

    const continueButton = page.getByRole('button', { name: 'Continue to Review' });
    await expect(continueButton).toBeEnabled({ timeout: 10_000 });
    await continueButton.click();

    // --- Review & Finalize ---
    await expect(page.getByRole('heading', { name: 'Review & Finalize' })).toBeVisible();
    await expect(page.getByText('Incomplete sections')).toHaveCount(0);
    await page.getByRole('button', { name: 'Finalize' }).click();
    const finalizeModal = page.locator('div.fixed.inset-0.z-50');
    await expect(finalizeModal.getByText('Finalize this franchise?')).toBeVisible();
    await finalizeModal.getByRole('button', { name: 'Finalize' }).click();

    await expect(page.getByText('Franchise created!')).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(/\/franchisee\/\d+/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: ownerName })).toBeVisible({ timeout: 10_000 });

    // --- Confirm the real Firm and Salon records are independently visible ---
    await page.goto('/firms');
    await page.getByPlaceholder('Search by firm name, GST...').fill(legalName);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(legalName)).toBeVisible({ timeout: 10_000 });

    await page.goto('/salons');
    await page.getByPlaceholder('Search by code, LA code, or name...').fill(salonName);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(salonName)).toBeVisible({ timeout: 10_000 });
  });
});
