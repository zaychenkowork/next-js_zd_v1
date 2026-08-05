import { test } from 'next/experimental/testmode/playwright/msw.js';
import { expect } from '@playwright/test';

import { authHandlers, catalogHandlers } from './fixtures/api';

// See the note in catalog.spec.ts on why this is not `test.use({ mswHandlers })`.
test.beforeEach(({ msw }) => {
  msw.use(...authHandlers, ...catalogHandlers);
});

test.describe('auth', () => {
  test('redirects an anonymous visitor away from the profile page', async ({
    page,
  }) => {
    await page.goto('/en/profile');

    // The redirect comes from `requireSession()` in the DAL, not from proxy.ts —
    // which is what makes it impossible to bypass by navigating client-side.
    await expect(page).toHaveURL(/\/en\/sign-in$/);
  });

  test('signs in, lands on the profile page and signs back out', async ({
    page,
  }) => {
    await page.goto('/en/sign-in');

    await page.getByLabel('Email').fill('emilys');
    await page.getByLabel('Password').fill('emilyspass');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/en\/profile$/);
    await expect(page.getByText('emily@example.com')).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(/\/en$/);
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  });

  test('shows the mapped server error when credentials are rejected', async ({
    page,
  }) => {
    await page.goto('/en/sign-in');

    await page.getByLabel('Email').fill('nobody');
    await page.getByLabel('Password').fill('wrong');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // `handleServerError` maps the upstream 400 to a translation key; the toast is
    // where the key becomes text. The raw upstream message never reaches the user.
    await expect(
      page.getByText('Something went wrong. Please try again.'),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/en\/sign-in$/);
  });

  test('saves the profile and re-renders the server-rendered heading', async ({
    page,
  }) => {
    await page.goto('/en/sign-in');
    await page.getByLabel('Email').fill('emilys');
    await page.getByLabel('Password').fill('emilyspass');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/en\/profile$/);

    await page.getByLabel('First name').fill('Emilia');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('Profile updated')).toBeVisible();
  });

  test('rejects a cross-origin call to the refresh endpoint', async ({
    request,
  }) => {
    const response = await request.post('/api/auth/refresh', {
      headers: { origin: 'https://evil.example' },
    });

    expect(response.status()).toBe(403);
  });
});
