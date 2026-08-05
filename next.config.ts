import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  /**
   * Cache Components (`cacheComponents: true`) stays OFF deliberately.
   *
   * It requires the Node.js runtime, is unsupported with `output: 'export'`,
   * and on a multi-instance self-hosted deployment it needs a shared cache
   * handler before `revalidateTag` propagates beyond one replica. The deploy
   * target is not decided yet, so the template uses the model that behaves
   * identically everywhere. docs/caching.md has the exact enable checklist and
   * the list of things ops has to provide first.
   */
  // cacheComponents: true,

  experimental: {
    /**
     * Opens the fetch-interception proxy that `next/experimental/testmode`
     * connects to, so Playwright can stub the API for *server-side* requests —
     * RSC reads, Server Actions, Route Handlers. Without it those hit the real
     * upstream and the suite becomes a network test.
     *
     * Gated behind an env var rather than `NODE_ENV`, because Playwright runs
     * against a production build in CI and the proxy has to be available there
     * too. `pnpm e2e` sets it (see playwright.config.ts); nothing else does, so a
     * normal `pnpm build` never ships it.
     */
    testProxy: process.env.NEXT_TEST_PROXY === 'true',
  },

  images: {
    /**
     * Every host `next/image` is allowed to optimise. This is an allowlist, not
     * a convenience: without it Next would happily proxy and cache images from
     * any URL a response contains. `remotePatterns` (not the deprecated
     * `domains`) is the supported form.
     *
     * `cdn.dummyjson.com` is here because the template's default API serves its
     * product images from there — replace it with your own asset hosts.
     */
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.dummyjson.com' }],
  },
};

const configWithIntl = withNextIntl(nextConfig);

/**
 * Sentry only wraps the config when an org is actually configured. Without it
 * `withSentryConfig` would warn about missing source-map upload credentials on
 * every build of a fresh clone, and the template must run with no Sentry
 * account at all.
 */
export default process.env.SENTRY_ORG
  ? withSentryConfig(configWithIntl, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,

      /**
       * Turbopack is the default bundler in Next 16 and the `webpack.*` options
       * of this plugin have no effect there, so source maps are uploaded after
       * the build through Next's `runAfterProductionCompile` hook instead. That
       * is already the default under Turbopack; it is spelled out here so the
       * mechanism is discoverable.
       */
      useRunAfterProductionCompileHook: true,

      /**
       * `tunnelRoute` (ad-blocker bypass) is left off: under Turbopack Sentry
       * does not auto-exclude the tunnel from the proxy matcher, and this app's
       * proxy.ts owns a broad matcher for next-intl routing. Enabling it means
       * adding a negative matcher there by hand — see docs/conventions.md.
       */
      // tunnelRoute: true,

      bundleSizeOptimizations: {
        excludeDebugStatements: true,
      },
    })
  : configWithIntl;
