# Reading data

## The short version

- **~90% of reads**: a Server Component awaits the Data Access Layer and passes
  plain objects down as props. No client cache, no loading state, no hydration
  payload.
- **The rest**: the client owns the data — infinite lists, live search, anything
  the user accumulates. Then TanStack Query, seeded from the server with
  `prefetch` + `dehydrate` + `HydrationBoundary`.
- **Never both for the same dataset.** One owner per dataset; see
  [state-management.md](./state-management.md).

## What "RSC" means here

A **React Server Component** renders only on the server. Its output is not HTML —
it is a serialised description of the rendered tree called the **RSC payload**,
which the client turns into DOM. That is why a Server Component can `await` a
database call and ship zero JavaScript for itself, and why it cannot use
`useState` or an event handler.

`'use client'` marks the boundary. Everything imported from a `'use client'`
module is in the client bundle. Everything above it is not. A Server Component
can render a Client Component and pass it serialisable props; a Client Component
cannot import a Server Component, but it _can_ receive server-rendered elements as
`children` — which is how `MainLayout` (server) renders inside `Providers`
(client).

## Pattern 1 — the default

[`src/app/[locale]/page.tsx`](../src/app/[locale]/page.tsx)

```tsx
export default async function HomePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, featured] = await Promise.all([
    getTranslations(),
    getProductList({ q: '', category: '', sort: 'newest', page: 1 }),
  ]);

  return <ProductGrid>{featured.products.map(/* ... */)}</ProductGrid>;
}
```

`getProductList` lives in the DAL ([`src/server/dal/products.ts`](../src/server/dal/products.ts)),
which is the only place that decides _how_ catalog data is fetched and _how long_
it may be cached. `Promise.all` because the two reads are independent — sequential
`await`s here would add a round trip for nothing.

This is the answer to "I want to fetch on the server and use it on the client
without ceremony": you already have. The data is in the markup.

## Pattern 2 — the client owns the list

[`src/app/[locale]/products/page.tsx`](../src/app/[locale]/products/page.tsx) →
[`ProductsInfinite`](../src/features/catalog/ProductsInfinite/ProductsInfinite.tsx)

```tsx
const queryClient = getServerQueryClient();

await queryClient.prefetchInfiniteQuery(productQueries.infinite(filters));

return (
  <HydrationBoundary state={dehydrate(queryClient)}>
    <ProductsInfinite filters={filters} />
  </HydrationBoundary>
);
```

1. `getServerQueryClient()` makes a **throwaway** QueryClient for this request. It
   renders nothing; a fresh instance per request is what makes cross-request data
   leaks impossible.
2. `prefetchInfiniteQuery` runs the same `queryFn` the browser would, so there is
   one definition of how a page of products is fetched.
3. `dehydrate()` serialises the cache into the RSC payload.
4. `HydrationBoundary` puts it into the _browser's_ QueryClient before
   `useInfiniteQuery` first runs. The list is server-rendered HTML with no loading
   state, and "load more" continues from page 1 on the client.

Two mistakes that are easy to make and quiet when made:

- **`prefetchInfiniteQuery`, not `prefetchQuery`.** An infinite query's cache entry
  has a `{ pages, pageParams }` shape. Prefetching the wrong one leaves the client
  refetching page 0 immediately.
- **`await` before `dehydrate()`.** `prefetchQuery` never throws and never
  suspends, so a missing `await` silently dehydrates an empty cache. The page
  still works — it just loses SSR, and nothing tells you.

### Three QueryClients, not one

| Role                                           | Where                                                       | Lifetime                   |
| ---------------------------------------------- | ----------------------------------------------------------- | -------------------------- |
| Browser client — the only one `useQuery` reads | [`browserQueryClient.ts`](../src/api/browserQueryClient.ts) | One per browser session    |
| SSR pass of that same file                     | same file, `environmentManager.isServer()` branch           | One per request            |
| Prefetch client for `dehydrate()`              | [`queryClient.ts`](../src/api/queryClient.ts)               | One per request, discarded |

The second row is the subtle one. `browserQueryClient.ts` is a Client Component
module, which still executes on the server during SSR — so it must hand back a
_fresh_ client there. A module-level singleton in a long-lived Node process would
be shared across requests from different users.

Note what `providers.tsx` does **not** do:

```tsx
// Wrong, per TanStack's own guidance:
const [queryClient] = useState(() => makeQueryClient());
```

> "Avoid useState when initializing the query client if you don't have a suspense
> boundary… React will throw away the client on the initial render if it
> suspends."

The module-level singleton with a server-side branch is the documented shape.

## Why `initialData` is not used

It looks like the simpler version of hydration and it is not:

1. It is treated as _"totally fresh, as if it were just fetched"_ — so the query
   is not marked stale and will not refetch when you expect it to.
2. _"If there is already data in the cache for a query, `initialData` will never
   overwrite this data, even if the new data is fresher."_

TanStack's docs conclude that hydration _"does not have these drawbacks, this will
be the focus for the rest of the documentation"_. Use `HydrationBoundary`. The one
place `initialData` is still reasonable is a value you already hold and that
cannot be stale — a slug from `params`, say — and even then a prop is simpler.

## Filters live in the URL

[`ProductFilters`](../src/features/catalog/ProductFilters/ProductFilters.tsx)
writes `searchParams`; the page reads them back through
[`parseProductFilters`](../src/schemas/productFilters.ts) and passes the parsed
object down.

That single decision buys a shareable link, a working back button, a
server-renderable list, and no state to synchronise between two places.

Two details:

- Every field uses zod's `.catch()` rather than failing. `?page=banana` is a
  hand-edited URL or a crawler; a 500 is the wrong answer to it.
- The filter panel receives current values as **props**, not from
  `useSearchParams`. That hook suspends during prerendering, and a component in the
  page shell that suspends drags the whole shell into client rendering. Inside a
  click handler, `window.location.search` is always available.

## `cache()` and when it earns its place

React's `cache()` memoises **within a single render**, keyed on _argument
identity_.

```text
// Worth it: primitive argument, two callers in one request
export const getProduct = cache(async (id: number) => …);

// Not worth it: `filters` is a fresh object every call, so the wrapper never hits
export async function getProductList(filters: ProductFilters) { … }
```

`generateMetadata` and the page component both need the same product in the same
request. With `cache()` that is one upstream call; without it, two cache lookups.
For object arguments, deduplication comes from Next's fetch cache instead, which
keys on the URL.

## Async Server Components and tests

Next's testing guidance is explicit:

> "Since async Server Components are new to the React ecosystem, Vitest currently
> does not support them… we recommend using E2E tests for async components."

So `src/app/**`, `src/features/**` and `src/server/**` are covered by Playwright,
and Vitest covers the deterministic layers. See [testing.md](./testing.md).

## Known upstream rough edge: not-found is not server-rendered

When `notFound()` is called, Next transports the 404 to the client and the
not-found UI renders after hydration; the initial HTML body is effectively empty.
The **status code is correct** (404), and the UI arrives in the same response, so
crawlers and users are fine — but a no-JavaScript visitor sees a blank 404 page.

This is upstream: [vercel/next.js#62228](https://github.com/vercel/next.js/issues/62228).
Nothing in this template can work around it; it is written down here so the next
person does not spend an afternoon assuming they broke it.
