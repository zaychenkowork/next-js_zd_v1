import { QueryClient } from '@tanstack/react-query';

import { QUERY_DEFAULT_OPTIONS } from '~/config/query';

/**
 * There are **three** QueryClient roles in an App Router app, and conflating
 * them is the classic source of both stale UI and cross-request data leaks:
 *
 *  1. The browser client — one per browser session, the only one `useQuery`
 *     ever reads from. Built in src/api/browserQueryClient.ts because it also
 *     wires the global toast/invalidation callbacks (client-only code).
 *  2. The same file's SSR pass — a Client Component still executes on the
 *     server, so it must return a *fresh* client there, never the module-level
 *     singleton, or one Node process would share cache across users.
 *  3. This file's `getServerQueryClient()` — a throwaway client used by Server
 *     Components purely to run `prefetchQuery` and be handed to `dehydrate()`.
 *     It renders nothing and dies with the request.
 *
 * This module intentionally imports no UI code so it stays safe to pull into a
 * Server Component graph. See docs/rsc-and-data-fetching.md.
 */

/**
 * Role 3. Always a new instance: a fresh client per call cannot leak between
 * requests, which is why the framework-agnostic guidance is "on the server,
 * always make a new query client".
 *
 * If prefetching ever needs to span a layout *and* a page within one request,
 * wrap this in React's `cache()` so both share one instance — the tradeoff is
 * described in docs/rsc-and-data-fetching.md.
 */
export function getServerQueryClient() {
  return new QueryClient({ defaultOptions: QUERY_DEFAULT_OPTIONS });
}
