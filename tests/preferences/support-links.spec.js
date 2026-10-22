import { test, expect } from '../../playwright';

test('Should verify all support links with correct URL in preference > Support tab', async ({ page }) => {
  await page.getByLabel('Open Preferences').click();
  await page.getByRole('tab', { name: 'Support' }).click();

  const locator_reportissues = page.getByRole('link', { name: 'Report Issues', exact: true });
  expect(await locator_reportissues.getAttribute('href')).toEqual('https://github.com/theusmoreira/gruno/issues');

  const locator_github = page.getByRole('link', { name: 'GitHub', exact: true });
  expect(await locator_github.getAttribute('href')).toEqual('https://github.com/theusmoreira/gruno');

  for (const removedLink of ['Twitter', 'Discord', 'Documentation', 'LinkedIn']) {
    await expect(page.getByRole('link', { name: removedLink, exact: true })).toHaveCount(0);
  }
});
