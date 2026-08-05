import { test } from 'next/experimental/testmode/playwright/msw.js';
import { expect } from '@playwright/test';

import { catalogHandlers } from './fixtures/api';

/**
 * These cover exactly what Vitest cannot: async Server Components, Server Actions,
 * cookies and the RSC round trip. Next's own testing guidance says as much — async
 * Server Components should be covered by E2E.
 *
 * `mswHandlers` stubs the API for requests Next makes *on the server*. Requests
 * the browser makes itself (the infinite query's "load more") need `page.route`
 * instead — both appear below, because knowing which tool reaches which request is
 * the whole trick.
 */
/**
 * Handlers are registered through the `msw` fixture in a `beforeEach`, not via
 * `test.use({ mswHandlers })`. The declarative option fixture that Next's bridge
 * exposes does not resolve under Playwright 1.62 — it arrives `undefined` and the
 * fixture throws `mswHandlers is not iterable`. Next declares `@playwright/test`
 * `^1.51.1` as a peer, so this is a version skew, not a usage error. `msw.use()`
 * is the same mechanism one step lower and works.
 */
test.beforeEach(({ msw }) => {
  msw.use(...catalogHandlers);
});

test.describe('catalog', () => {
  test('renders server-fetched products on the home page', async ({ page }) => {
    await page.goto('/en');

    await expect(
      page.getByRole('heading', { name: 'Featured products' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Product 1', exact: true }),
    ).toBeVisible();
  });

  test('navigates to a product page with its own metadata', async ({
    page,
  }) => {
    await page.goto('/en/products');

    await page.getByRole('link', { name: 'Product 2' }).first().click();

    await expect(
      page.getByRole('heading', { level: 1, name: 'Product 2' }),
    ).toBeVisible();
    await expect(page).toHaveTitle(/Product 2/);
  });

  test('returns a 404 page for a product that does not exist', async ({
    page,
  }) => {
    const response = await page.goto('/en/products/9999');

    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole('heading', { name: 'Page not found' }),
    ).toBeVisible();
  });

  test('adds a product to the cart and updates the server-rendered badge', async ({
    page,
  }) => {
    await page.goto('/en/products/1');

    await page.getByRole('button', { name: 'Add to cart' }).click();

    // The badge is rendered by the layout on the server. It updating without a
    // reload is the whole point: the Server Action's response carries a
    // re-rendered RSC payload.
    await expect(page.getByRole('link', { name: /Cart 1/ })).toBeVisible();

    await page.getByRole('link', { name: /Cart/ }).click();
    await expect(page.getByText('Total:')).toBeVisible();
  });

  test('keeps a filter in the URL so the list is shareable', async ({
    page,
  }) => {
    await page.goto('/en/products');

    await page.getByLabel('Search').fill('Product 1');

    await expect(page).toHaveURL(/\?q=Product\+1/);
    await expect(
      page.getByRole('link', { name: 'Product 1', exact: true }),
    ).toBeVisible();
  });

  test('appends a page in the browser when Load more is used', async ({
    page,
  }) => {
    /**
     * `page.route`, not `mswHandlers`: this request is issued by TanStack Query
     * inside the browser, so it never passes through Next's server-side fetch
     * proxy.
     */
    await page.route('https://api.test/products*', async (route) => {
      const url = new URL(route.request().url());
      const skip = Number(url.searchParams.get('skip') ?? 0);
      const limit = Number(url.searchParams.get('limit') ?? 12);

      await route.fulfill({
        json: {
          products: Array.from(
            { length: Math.min(limit, 14 - skip) },
            (_, i) => ({
              id: skip + i + 1,
              title: `Product ${skip + i + 1}`,
              description: 'd',
              category: 'beauty',
              price: 10,
              rating: 4,
              stock: 5,
              thumbnail: 'https://cdn.dummyjson.com/test.webp',
            }),
          ),
          total: 14,
          skip,
          limit,
        },
      });
    });

    await page.goto('/en/products');

    await expect(page.getByRole('link', { name: 'Product 12' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Product 13' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Load more' }).click();

    await expect(page.getByRole('link', { name: 'Product 13' })).toBeVisible();
    // The first page is still there — the client owns this list.
    await expect(
      page.getByRole('link', { name: 'Product 1', exact: true }),
    ).toBeVisible();
  });
});
