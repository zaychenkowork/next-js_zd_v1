import { defineConfig } from 'next/experimental/testmode/playwright.js';
import { devices } from '@playwright/test';

/**
 * E2E lives in `e2e/`, not next to the source, and that is not a style choice:
 * Playwright drives a real browser against a real server while Vitest runs in
 * jsdom. Sharing a directory means one runner picks up the other's files. Every
 * production Next repo surveyed for this template keeps them apart.
 *
 * `defineConfig` comes from `next/experimental/testmode/playwright.js`, not from
 * `@playwright/test`. It registers the `next` and `msw` fixtures that let a test
 * stub the API for requests Next makes *on the server* — which is where most of
 * this app's data fetching happens, and something `page.route` cannot reach.
 *
 * Two import quirks of that module, both of which cost time to rediscover:
 *
 *  - The `.js` extension is required. `next/experimental/testmode/` contains both
 *    a `playwright.js` file and a `playwright/` directory, and Node's ESM resolver
 *    picks the directory and fails with `ERR_UNSUPPORTED_DIR_IMPORT`. Same for
 *    `playwright/msw.js` in the specs.
 *  - Only `defineConfig` and `test` come from it. It is CommonJS that re-exports
 *    `@playwright/test` with `export *`, which Node's CJS lexer cannot see
 *    through — so `devices` has to be imported from `@playwright/test` directly.
 */
const PORT = 3210;
/**
 * `localhost`, not `127.0.0.1`. Next's dev server treats a request for
 * `/_next/static/**` from an origin outside `allowedDevOrigins` as cross-origin
 * and answers **403** — every chunk fails, the page never hydrates, and every
 * interaction test times out with no hint as to why. `localhost` is allowed by
 * default; the alternative is adding `allowedDevOrigins: ['127.0.0.1']` to
 * next.config.ts, which is config the app does not otherwise need.
 */
const baseURL = `http://localhost:${PORT}`;
const isCI = process.env.CI === 'true';

export default defineConfig({
  testDir: './e2e',
  /**
   * `defineConfig` merges Next's own defaults, which include
   * `testMatch: '{app,pages}/**\/*.spec.{t,j}s'` — written for suites colocated
   * with routes. Left alone it wins over `testDir` and nothing is discovered.
   */
  testMatch: '**/*.spec.ts',
  /**
   * Serial, and not for tidiness. `next/experimental/testmode` registers its
   * fetch stubs against one shared Next server; running specs in parallel lets
   * one test's handlers be in place while another test's page is rendering, and
   * the second one gets an unstubbed API — which surfaces as a 500 page and a
   * pile of unrelated-looking failures.
   */
  fullyParallel: false,
  workers: 1,
  // A `test.only` left in a branch should fail the pipeline, not silently skip
  // the rest of the suite.
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  /**
   * 10s instead of the 5s default. Two things in this app legitimately need it:
   * first-hit route compilation in `next dev`, and not-found UI that Next
   * transports to the client rather than server-rendering
   * (vercel/next.js#62228), so it appears after hydration.
   */
  expect: { timeout: 10_000 },

  use: {
    baseURL,
    trace: 'on-first-retry',
    /**
     * Pinned, because next-intl's `localeDetection` is on: without a fixed
     * `Accept-Language` the bare `/` redirect depends on whatever locale the CI
     * runner's browser reports.
     */
    locale: 'uk-UA',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    /**
     * Firefox and WebKit are configured but not run by default — three browsers
     * on every local run is a tax nobody pays willingly. Enable them in CI with
     * `--project=firefox --project=webkit`.
     */
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  webServer: {
    /**
     * A production build in CI, `next dev` locally. The dev server is slower but
     * gives usable stack traces; CI needs the build it will actually ship.
     */
    command: isCI
      ? `pnpm build && pnpm start --port ${PORT}`
      : `pnpm dev --port ${PORT}`,
    /**
     * The readiness probe hits `/robots.txt`, not `/`. Every page in this app
     * fetches from the API, and during the probe no test is running yet — so the
     * test proxy has no handlers registered, the fetch fails, and the page answers
     * 500. Playwright would then wait out the full timeout and report a server
     * that never started. `/robots.txt` needs no data.
     */
    url: `${baseURL}/robots.txt`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: {
      NEXT_TEST_PROXY: 'true',
      // The app validates its env at import time, so these have to be present
      // even though every API call is stubbed.
      NEXT_PUBLIC_APP_URL: baseURL,
      NEXT_PUBLIC_API_URL: 'https://api.test',
      NEXT_PUBLIC_ENABLE_DEVTOOLS: 'false',
      API_URL: 'https://api.test',
    },
  },
});
