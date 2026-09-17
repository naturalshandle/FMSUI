import { type Page, expect } from '@playwright/test';

/**
 * The Officials table is server-paginated (page size 20) and the on-page search box
 * only filters whatever page is already loaded — it can't find a row sitting on a
 * later page. This narrows by the server-side type filter (usually enough on its
 * own for a small dev dataset) and, if the row still isn't visible, pages forward
 * with "Next" until it's found or pagination is exhausted, rather than assuming
 * page 0 is sufficient.
 */
export async function findOfficialRowByName(page: Page, name: string, officialType: string) {
  await page.getByPlaceholder('Region').fill('');
  const typeFilter = page.locator('select').first();
  await typeFilter.selectOption(officialType);
  await page.waitForLoadState('networkidle');

  for (let attempt = 0; attempt < 25; attempt++) {
    const row = page.locator('tr', { hasText: name });
    if (await row.count()) return row.first();

    const nextButton = page.getByRole('button', { name: 'Next' });
    if (!(await nextButton.isEnabled().catch(() => false))) break;
    await nextButton.click();
    await page.waitForLoadState('networkidle');
  }

  throw new Error(`Could not find an Officials row for "${name}" across pages (type filter: ${officialType}).`);
}

export async function expectOfficialLinked(page: Page, name: string, officialType: string) {
  const row = await findOfficialRowByName(page, name, officialType);
  await expect(row.getByText(/Linked \(User #\d+\)/)).toBeVisible();
}
