# State ownership

## One dataset, one owner

Every piece of data in the app has exactly one home. Two homes means two expiry
policies and no way to know which copy the user is looking at.

| Dataset                      | Owner                | Mechanism                                              |
| ---------------------------- | -------------------- | ------------------------------------------------------ |
| Catalog list, product detail | **Server**           | RSC + DAL + Data Cache with tags                       |
| Category list                | **Server**           | RSC + DAL, passed to the filter panel as props         |
| Cart                         | **Server**           | httpOnly cookie, mutated by Server Actions             |
| Profile, orders              | **Server**, uncached | DAL with `authorization` header (never Data-Cached)    |
| Filters, sort, search term   | **URL**              | `searchParams`                                         |
| "Load more" accumulated list | **Client**           | TanStack Query `useInfiniteQuery`                      |
| Theme                        | **Client**           | `next-themes` + `localStorage` + a pre-paint script    |
| Drawer/modal open state      | **Client**           | Local `useState`, or Zustand if two components need it |

If you are about to add a `useQuery` for something in the first four rows, stop and
ask which copy is authoritative. Usually the answer is "the server one", and the
component wants a prop.

## When a client store is justified

Use local `useState` until client UI state must be coordinated by distant components
or outlive the component that created it. A drawer shared by the header and several
feature entry points may justify a small store; a single dialog does not.

Do not put server data in a client store. This is not a stylistic preference —
Redux's own documentation says the same thing about itself:

> "only use Redux for globally shared, mutable data"

and recommends a query cache rather than a general store for loading data. Zustand
is installed for shared client UI state. When creating a store, keep two
Next-specific rules:

1. **One store per request on the server.** A module-level store in a long-lived
   Node process is shared across users. Per-user state has to be created in a
   provider, not at module scope.
2. **Server Components never read a store.** They cannot use client hooks, and they
   should read authoritative data from the request instead.

## Theme is specialized client state

[`next-themes`](https://github.com/pacocoursey/next-themes) owns theme persistence,
system-preference detection, cross-tab synchronization and the pre-paint script.
[`ThemeSwitcher`](../src/components/ThemeSwitcher/ThemeSwitcher.tsx) uses its
`useTheme` hook to change the theme.

The switcher still picks its icon with CSS
(`:global([data-theme='dark']) .sun { display: none }`) rather than from React state,
so its server and client markup remain identical. See [theming.md](./theming.md).

The alternative — a theme cookie read in the layout — has no flash and no mismatch
either, but calls `cookies()` and so opts every page out of static rendering. For a
preference this cheap, the blocking inline script is the better trade.

## TanStack Query's actual job here

Not "the data layer". Its job is the cases where **the client accumulates state the
server does not model**:

- infinite lists (`/products`)
- live search as you type, if you want results cached per term
- optimistic updates that need rollback
- polling

For a plain read that renders once, a Server Component is less code and less
JavaScript.

Defaults are in [`src/config/query.ts`](../src/config/query.ts):

```ts
staleTime: 60_000,      // don't refetch on every mount
gcTime: 5 * 60_000,
retry: 2,               // queries
mutations: { retry: 0 } // never retry a write
```

Two dehydrate options worth explaining:

```ts
dehydrate: {
  shouldDehydrateQuery: (q) => defaultShouldDehydrateQuery(q) || q.state.status === 'pending',
  shouldRedactErrors: () => false,
}
```

- Including **pending** queries lets a prefetch that has not resolved yet still be
  streamed — the client picks up the in-flight promise instead of starting over.
- `shouldRedactErrors: false` because our server errors are already translation
  keys, not messages: there is nothing sensitive to redact, and redacting them would
  replace a usable key with a generic one.

## The cart, as a worked example

The cart is the clearest case of server ownership:

- `{ productId, quantity }[]` in an httpOnly cookie — survives a reload, works with
  JavaScript disabled, cannot be tampered with from the console.
- Prices and titles are **never** stored there; they are re-read from the catalog on
  every render. A cart that remembers last week's price is a support ticket.
- Mutations are Server Actions. Writing the cookie makes the action's response carry
  a re-rendered page, so the badge in the header updates in the same round trip.
- Zustand holds none of it. If a cart drawer is added, Zustand holds `isOpen` and
  nothing else.

This is the shape `vercel/commerce` uses too: a server cart plus `updateTag`, and
**zero** client-side cache libraries in its `package.json`.
