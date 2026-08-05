import { test } from 'next/experimental/testmode/playwright/msw.js';
import { expect } from '@playwright/test';

import { catalogHandlers } from './fixtures/api';

// See the note in catalog.spec.ts on why this is not `test.use({ mswHandlers })`.
test.beforeEach(({ msw }) => {
  msw.use(...catalogHandlers);
});

test.describe('i18n and theming', () => {
  test('redirects the bare root to the default locale', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/uk$/);
  });

  test('sets dir="rtl" only for the Arabic locale', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

    await page.goto('/ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  });

  test('switches locale while keeping the current path', async ({ page }) => {
    await page.goto('/en/products');

    await page.getByRole('combobox', { name: 'Change language' }).click();
    await page.getByRole('option', { name: 'Українська' }).click();

    await expect(page).toHaveURL(/\/uk\/products$/);
    await expect(page.getByRole('heading', { name: 'Товари' })).toBeVisible();
  });

  test('serves a localised 404 inside the locale chrome', async ({ page }) => {
    const response = await page.goto('/uk/does-not-exist');

    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole('heading', { name: 'Сторінку не знайдено' }),
    ).toBeVisible();
    // Still inside the locale layout — the nav is there.
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('applies the stored theme before paint, with no flash', async ({
    page,
  }) => {
    await page.goto('/en');
    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // The pre-hydration script is what makes this survive a reload without the
    // page rendering light first.
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
