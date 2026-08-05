import 'server-only';

import { revalidateTag, updateTag } from 'next/cache';

import { CACHE_TAGS } from '~/server/cache/tags';

/* -----------------------------------------------------------------------------
 * The invalidation surface, in one server-only file. Worth reading once, because
 * the three tools here are not interchangeable.
 *
 * `updateTag(tag)` expires the tag immediately **and** the enclosing Server
 * Action's response carries a freshly rendered RSC payload, which the client
 * commits as a seeded navigation. The user sees new data in the same round trip —
 * no follow-up fetch, no `router.refresh()`, no loading flash. This is what you
 * want after a mutation the user is watching. It throws if it is not called from
 * within a Server Action, which is why these helpers are plain functions invoked
 * *by* actions rather than actions themselves.
 *
 * `revalidateTag(tag, 'max')` is stale-while-revalidate: the current value keeps
 * being served while a refresh happens in the background, and the response does
 * **not** re-render the route. Right for webhooks and cron, wrong for "I clicked
 * save and want to see it". Also the only one of the two that works in a Route
 * Handler.
 *
 * `revalidateTag(tag)` with no second argument still works but is deprecated in
 * Next 16 and logs a warning — it is the old immediate-expiry behaviour, now
 * spelled `updateTag`.
 *
 * ## Not a `'use server'` file, on purpose
 *
 * Every export of a `'use server'` module is a real, unauthenticated HTTP endpoint
 * that anyone can POST to — the action ids are obfuscated, not secret
 * (GHSA-955p-x3mx-jcvp, Moderate, 2026-07-21). Nothing in this template needs a
 * *client* to trigger an invalidation, so shipping these as endpoints would be
 * three open doors for no benefit.
 *
 * If a Client Component ever does need one — typically through
 * `mutationMeta.revalidate`, see src/api/browserQueryClient.ts — add a thin
 * `'use server'` wrapper and keep it boring:
 *
 *   // src/server/cache/actions.ts
 *   'use server';
 *   import { revalidateProduct } from '~/server/cache/revalidate';
 *   export async function revalidateProductAction(id: number) {
 *     revalidateProduct(id);
 *   }
 *
 * Anything that reads or writes user data must not go there; it belongs behind
 * `authAction` in src/server/actions/client.ts, which checks the session before
 * the handler runs. See docs/mutations.md.
 * -------------------------------------------------------------------------- */

/**
 * A single product changed. The list embeds price and stock, so it is invalidated
 * too — cheaper than tagging every list page with every product id it contains.
 */
export function revalidateProduct(id: number) {
  updateTag(CACHE_TAGS.product(id));
  updateTag(CACHE_TAGS.products);
}

/**
 * Background invalidation for Route Handlers — a CMS webhook, a cron job, an admin
 * tool. `updateTag` would throw here because it refuses to run outside a Server
 * Action, and stale-while-revalidate is the right behaviour anyway: visitors keep
 * getting the current value while the refresh happens behind them.
 *
 * A caveat that bites on self-hosted multi-instance deployments: `revalidateTag`
 * does not propagate between replicas on its own. Sharing invalidation needs a
 * shared cache handler (`cacheHandlers` in next.config.ts, new in Next 16) — see
 * docs/caching.md.
 */
export function revalidateCatalogInBackground() {
  revalidateTag(CACHE_TAGS.products, 'max');
  revalidateTag(CACHE_TAGS.categories, 'max');
}
