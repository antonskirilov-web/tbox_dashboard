const { test, expect } = require('@playwright/test');

// URL задеплоенного GAS web app
const APP_URL = process.env.APP_URL || 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';

test.describe('Авторизация', () => {
  test('страница загружается', async ({ page }) => {
    await page.goto(APP_URL);
    await expect(page).toHaveTitle(/.+/);
  });

  test('форма логина отображается', async ({ page }) => {
    await page.goto(APP_URL);
    await expect(page.locator('input[type="text"], input[name="login"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
