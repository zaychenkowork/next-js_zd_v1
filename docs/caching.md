# Caching

## Four caches, and they are unrelated

| Cache                    | Lives          | Holds                                        | Cleared by                                                          |
| ------------------------ | -------------- | -------------------------------------------- | ------------------------------------------------------------------- |
| **Data Cache**           | Server         | `fetch` responses                            | `updateTag`, `revalidateTag`, `revalidatePath`, TTL                 |
| **Full Route Cache**     | Server         | Rendered HTML + RSC payload of static routes | Same, plus a deploy                                                 |
| **Router Cache**         | Browser memory | RSC payloads of visited routes               | `router.refresh()`, a mutation's seeded navigation, navigation away |
| **TanStack Query cache** | Browser memory | Whatever `useQuery` fetched                  | `invalidateQueries`, `gcTime`                                       |

`router.refresh()` _"clears the Client Cache for the current route, but does not
invalidate the server-side cache."_ `queryClient.invalidateQueries()` does nothing
to server-rendered output. Confusing the two is the single most common source of
"why is my UI stale" — and it is worth stating plainly: **the server cache and the
client cache are completely separate systems.**

The double-caching bug this template avoids: fetching the same dataset through both
a Server Component and a `useQuery`. Then you have two copies with two expiry
policies and no way to know which one the user is looking at. One owner per
dataset — see [state-management.md](./state-management.md).

## Caching is opt-in now

Since Next 15, a bare `fetch` is **not** cached at runtime. Next 16.3 confirms it in
`next/dist/server/lib/patch-fetch.js`: with no `cache` and no `next.revalidate`,
`hasNoExplicitCacheConfig` is true and it sets `autoNoCache = true`.

So every cacheable read says so:

```ts
// src/server/dal/products.ts
api.productsGet(query, {
  next: { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CACHE_TAGS.products] },
});
```

Two automatic opt-_outs_ are worth knowing, both from the same file:

```js
const hasUnCacheableHeader =
  initHeaders.get('authorization') || initHeaders.get('cookie');
const isUnCacheableMethod = !['get', 'head'].includes(method);
```

A request carrying an `authorization` or `cookie` header is never Data-Cached. That
is why per-user reads in [`dal/profile.ts`](../src/server/dal/profile.ts) are
uncached _without anyone having to remember to say so_ — the session header does it.
It also means you cannot accidentally put one user's profile in a shared cache.

During build-time prerendering the automatic no-cache is skipped
(`isBuildTimePrerendering`), so the export workers can share a fetch cache.

## Tags

All of them are in [`src/server/cache/tags.ts`](../src/server/cache/tags.ts).
Strings scattered across a codebase drift, and a read tagged `'products'` with an
invalidation for `'product'` fails **silently** — no error, no invalidation.

```ts
export const CACHE_TAGS = {
  products: 'products',
  product: (id: number) => `product:${id}`,
  categories: 'categories',
} as const;
```

Granularity guidance: tag the read with what it _is_, and invalidate the union of
what a mutation _affects_. A product list embeds price and stock, so
`revalidateProduct(id)` expires both `product:id` and `products` — cheaper than
tagging every list page with every product id it contains.

## Every route in this app is dynamic, on purpose

`next build` shows `ƒ` for everything. That is because the root layout reads
cookies for the cart badge and the auth link, and touching request data anywhere in
a layout makes every route it wraps dynamic.

**It is much less bad than it looks.** The upstream reads are still served from the
tagged Data Cache, so a dynamic render usually makes no network call at all — it
renders from cached data. What you lose is cached _HTML_, not cached data.

### The trap, if you try to mix them

Adding `generateStaticParams` to a route while a layout reads cookies fails at
runtime with:

```
Error: An error occurred in the Server Components render… { digest: 'DYNAMIC_SERVER_USAGE' }
```

— a 500 with no useful message in production. The two are mutually exclusive under
the classic (non-Cache-Components) model. This template removed
`generateStaticParams` from the product page for exactly that reason; the comment at
the top of [`products/[id]/page.tsx`](../src/app/[locale]/products/[id]/page.tsx)
records it.

### Getting static HTML back

Pick one, then re-add `generateStaticParams`:

**Option A — take the cookies out of the root layout.** Move the badge into a client
island (or drop it), delete the `getSession()` / `getCartLines()` calls from
[`app/[locale]/layout.tsx`](../src/app/[locale]/layout.tsx), then:

```ts
export async function generateStaticParams() {
  const { products } = await api.productsGet({ limit: 100, skip: 0 });
  return products.map(({ id }) => ({ id: String(id) }));
}
```

Cost: the badge and the auth link render after hydration, and `pnpm build` now needs
the API reachable.

**Option B — enable Cache Components.** This is what it exists for: a prerendered
shell with the cookie-reading parts streamed in behind `<Suspense>`.

## Enabling `cacheComponents`

It is commented out in [`next.config.ts`](../next.config.ts). The checklist before
turning it on:

1. **Node.js runtime required.** Incompatible with `output: 'export'`.
2. **Explicit caching moves to `use cache`** with `cacheLife` and `cacheTag`.
   `use cache: private` is the only variant that may read `cookies()`/`headers()`.
3. **Every dynamic read needs a `<Suspense>` boundary** above it, or the build
   fails. That is the feature, not a bug: it is how the shell stays static.
4. **Router cache gains a hard 30-second stale floor.** A navigation back to a
   route may show up-to-30-second-old data even after an invalidation.
5. **Multi-instance self-hosting needs a shared cache handler first** — see below.

Turning it on changes `revalidateTag` semantics and requires touching every DAL
function. Do it as its own change, with the E2E suite green before and after.

## Self-hosting

Two _different_ mechanisms, easy to confuse because the names differ by one letter:

- `cacheHandler` (singular) — the legacy ISR handler. Default in-memory limit is
  50 MB per instance.
- `cacheHandlers` (plural) — new in Next 16, keys `default` and `remote`, interface
  `get / set / refreshTags / getExpiration / updateTags`.

Things ops has to know:

- **`revalidateTag` does not propagate between replicas.** Invalidating on instance
  A leaves B serving the old value until its TTL. Shared invalidation needs a shared
  cache handler.
- `deploymentId` must be set so clients do not mix chunks across deploys.
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` must be stable across instances and deploys,
  or encrypted action arguments fail to decrypt.
- The refresh endpoint's single-flight lock is per-instance for the same reason —
  see [auth.md](./auth.md).

## Webhook recipe

```ts
// app/api/webhooks/catalog/route.ts
import { revalidateCatalogInBackground } from '~/server/cache/revalidate';

export async function POST(request: Request) {
  if (!verifySignature(request)) return new Response(null, { status: 401 });

  revalidateCatalogInBackground(); // revalidateTag(tag, 'max')
  return new Response(null, { status: 204 });
}
```

`revalidateTag(tag, 'max')` and not `updateTag`: `updateTag` throws outside a Server
Action, and stale-while-revalidate is what you want here — visitors keep getting the
current value while the refresh happens behind them.
