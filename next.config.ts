import type { NextConfig } from 'next';
import type { TurbopackLoaderOptions } from 'next/dist/server/config-shared';
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';

import { version } from './package.json';
import { ICONS_PATH_PATTERN, svgrOptions } from './svgr.config.js';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  /**
   * Build-time constants, not deployment configuration — the `env` key inlines
   * whatever is listed here into both bundles at build time, so nothing about
   * it can vary per environment. `.env` remains the only route for anything a
   * deployment sets.
   *
   * This is the one thing the key is still good for: `package.json` is the
   * source of truth for the version, and importing it from application code
   * would ship the whole file (dependency list included) to the browser.
   * `CONFIG.APP_VERSION` reads the result. The Next docs mark `env` as legacy
   * in favour of `.env` — correct for actual environment variables, which this
   * is not.
   */
  env: {
    APP_VERSION: version,
  },

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

  turbopack: {
    /**
     * Turns the SVGs in `src/assets/icons/` into React components, so an icon
     * can inherit `color` and take props instead of being an opaque `<img>`.
     * Turbopack is the bundler in Next 16 — a `webpack()` block would be dead
     * config here, which is the trap when copying this from an older project.
     *
     * The rule is *scoped*, and that is the load-bearing part. A blanket
     * `'*.svg'` rule turns every SVG in the repo into a component, which quietly
     * breaks `next/image` static imports and anything else expecting a URL. The
     * condition confines the transform to `src/assets/icons/`; everything else
     * keeps Next's default asset handling. `{ not: 'foreign' }` keeps the loader
     * from being invoked on `node_modules`.
     *
     * `as: '*.js'` tells Turbopack the loader returns JavaScript — without it
     * the output is treated as an asset again and the rule does nothing.
     *
     * See docs/assets.md.
     */
    rules: {
      '*.svg': {
        condition: {
          all: [{ not: 'foreign' }, { path: ICONS_PATH_PATTERN }],
        },
        loaders: [
          {
            loader: '@svgr/webpack',
            /**
             * Turbopack types loader options as `Record<string, JSONValue>`
             * because it serializes them across the JS/Rust boundary — SVGR's
             * own `Config` describes the same object more precisely but has no
             * index signature, so the two are structurally incompatible even
             * though every value here is JSON. The cast is the whole reason
             * `svgr.config.js` sticks to plain data: a function-valued option
             * would type-check after this cast and then fail at build time.
             */
            options: svgrOptions as TurbopackLoaderOptions,
          },
        ],
        as: '*.js',
      },
    },
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
