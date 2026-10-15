import { test, expect } from './fixtures';

test('la portada carga con título y enlaces', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page).toHaveTitle(/Royal/i);
  await expect(page.locator('a').first()).toBeVisible();
});
