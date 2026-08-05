import createMiddleware from 'next-intl/middleware';

import { routing } from '~/i18n/routing';

/**
 * Proxy (renamed from Middleware in Next.js 16) does exactly one job here:
 * locale detection and prefixing for next-intl.
 *
 * It deliberately performs **no authorization**. Two reasons, both documented:
 *
 *  1. The Next.js auth guide states that Proxy "should not be your only line of
 *     defense" and that checks belong as close to the data as possible — see
 *     `src/server/dal/` and docs/auth.md.
 *  2. Server Functions are not separate routes in the Proxy chain: they are
 *     POSTs to the route that uses them, so a matcher change can silently drop
 *     Proxy coverage for a mutation. The framework's own advice is to "verify
 *     authentication and authorization inside each Server Function rather than
 *     relying on Proxy alone" — which is what `authClient` in
 *     `src/server/safe-action.ts` enforces.
 *
 * CVE-2025-29927 (authorization bypass via a spoofed `x-middleware-subrequest`
 * header, CVSS 9.1, self-hosted deployments affected) is the historical reason
 * this rule exists rather than being a matter of taste.
 */
export default createMiddleware(routing);

export const config = {
  /**
   * Match everything except API routes, Next.js internals, and any path with a
   * file extension (static assets). Without a matcher, Proxy would also run for
   * CSS, JS and images.
   *
   * If Sentry's `tunnelRoute` is ever enabled, its path has to be excluded here
   * by hand: under Turbopack Sentry does not do it automatically. See the note
   * in next.config.ts.
   */
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
};
