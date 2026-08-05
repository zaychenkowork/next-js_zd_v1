# Writing data

## The rule

**Every write goes through a Server Action wrapped by `next-safe-action`**
([`src/server/actions/client.ts`](../src/server/actions/client.ts)), except the
cases in the "Route Handler instead" section below.

_How_ you call that action depends on who owns the data:

| Situation                                               | Call it with                           | Example                                                                           |
| ------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------- |
| The mutation invalidates data in the **TanStack cache** | `useMutation(mutationOptions(action))` | [`AddToCartButton`](../src/features/catalog/AddToCartButton/AddToCartButton.tsx)  |
| Server-owned data, wants an optimistic UI               | `useOptimisticAction`                  | [`CartQuantity`](../src/features/cart/CartLines/CartQuantity.tsx)                 |
| Server-owned data, plain                                | `useAction`                            | [`RemoveCartLineButton`](../src/features/cart/CartLines/RemoveCartLineButton.tsx) |
| A form                                                  | `useHookFormAction`                    | [`ProfileForm`](../src/features/profile/ProfileForm/ProfileForm.tsx)              |

There is no "always use `useMutation`" rule and no ban on it either. `useMutation`
brings a client cache with it; reach for it when there _is_ a client cache to
maintain, and skip the machinery when there isn't.

## Why every action is wrapped

A `'use server'` export is a real, unauthenticated HTTP endpoint. The action ids
are obfuscated, not secret — an unauthenticated disclosure of internal Server
Function endpoints was a real advisory
([GHSA-955p-x3mx-jcvp](https://github.com/advisories/GHSA-955p-x3mx-jcvp),
Moderate, CVSS 6.3, 2026-07-21). So:

- `actionClient` makes input validation unskippable (`.inputSchema()`).
- `authAction` makes the session check unskippable — it runs _before_ the handler,
  so a forgotten `requireSession()` inside a handler cannot become a data leak.
- `handleServerError` maps every failure to a translation **key**. Stack traces,
  upstream URLs and database messages stay on the server and go to Sentry. This is
  the hook next-safe-action calls "the authoritative place for server-side
  observability".

`serverError` crossing the boundary is a key like `'errors.unauthorized'`, not a
sentence. The client funnel runs it through `t()`. Returning a localised string
from the server would mean the server has to know the user's locale for every
error, and the same message could never be reused by a mobile client.

## The thing that surprises everyone

**A Server Action returns the mutation result _and_ a freshly rendered RSC payload
in the same response**, which the client commits as a seeded navigation. Next's own
words: _"Your application code does not need a follow-up fetch."_

Any of these inside an action triggers that re-render:

- `updateTag(tag)`
- `revalidatePath(path)`
- `refresh()`
- writing a cookie
- `redirect()`

So "I mutated on the server, how do I update the UI without reloading?" usually has
no answer to write — it already happened. [`addToCartAction`](../src/server/actions/cart.ts)
writes a cookie and the server-rendered cart badge in the header updates in the
same round trip. No `router.refresh()`, no follow-up fetch, no loading flash.

The one exception: `revalidateTag(tag, 'max')` is stale-while-revalidate and does
**not** re-render the route.

## Choosing an invalidation tool

| Tool                                | Callable from              | Effect                                                                            | Use when                                               |
| ----------------------------------- | -------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `updateTag(tag)`                    | Server Actions only        | Expires the tag immediately **and** re-renders in the same response               | The user is watching. Read-your-writes.                |
| `revalidateTag(tag, 'max')`         | Actions and Route Handlers | Stale-while-revalidate, **no** re-render                                          | Webhooks, cron, background refresh                     |
| `revalidateTag(tag, { expire: 0 })` | Actions and Route Handlers | Expires now, no re-render                                                         | The old value is legally or financially wrong to serve |
| `refresh()`                         | Server Actions only        | Re-renders **dynamic** data on the client; touches no cache                       | The data was never cached (per-user reads)             |
| `router.refresh()`                  | Client                     | Clears the client Router Cache for the current route; keeps `useState` and scroll | You need the client to re-request the route            |

Notes worth knowing:

- `revalidateTag(tag)` with **no** second argument still works but is deprecated in
  Next 16 and logs a warning. It is the old immediate-expiry behaviour, now spelled
  `updateTag`.
- `updateTag` throws outside a Server Action — including in Route Handlers. That is
  enforced in `next/dist/server/web/spec-extension/revalidate.js`, not just
  documented.
- `refresh()` requires `phase === 'action'`; it sets
  `pathWasRevalidated = ActionDidRevalidateDynamicOnly`, i.e. _"the Server Action
  version of refresh() only revalidates the dynamic data on the client. It doesn't
  affect cached data."_
- `router.refresh()` _"clears the Client Cache for the current route, but does not
  invalidate the server-side cache."_ Two different caches — see
  [caching.md](./caching.md).
- A tag is capped at 256 characters and is opaque to Next. The `entity:id`
  convention in [`cache/tags.ts`](../src/server/cache/tags.ts) is ours.

## Where the invalidation surface lives

All of it is in [`src/server/cache/revalidate.ts`](../src/server/cache/revalidate.ts),
as **plain server-only functions** that Server Actions call:

```ts
// src/server/actions/cart.ts
await writeCartLines(next);
revalidateProduct(productId); // updateTag ×2, inside the action's context
```

`updateTag` throws outside a Server Action, so these helpers only work when invoked
_by_ one — which is exactly the constraint that keeps them from being misused.

They are deliberately **not** a `'use server'` module. Every export of one is a real,
unauthenticated HTTP endpoint, and nothing in this template needs a _client_ to
trigger an invalidation, so shipping them as endpoints would be open doors for no
benefit.

If a Client Component does need one — typically through `mutationMeta.revalidate`
(see [`browserQueryClient.ts`](../src/api/browserQueryClient.ts)) — add a thin
wrapper and keep it boring:

```ts
// src/server/cache/actions.ts
'use server';

import { revalidateProduct } from '~/server/cache/revalidate';

export async function revalidateProductAction(id: number) {
  revalidateProduct(id);
}
```

That is safe to expose because the worst a caller achieves is making the server
re-fetch public catalog data. Anything that reads or writes **user** data must not go
there — it belongs behind `authAction`, which checks the session before the handler
runs.

## Route Handler instead of a Server Action

Use a Route Handler ([`app/api/auth/refresh/route.ts`](../src/app/api/auth/refresh/route.ts)
is the worked example) when any of these apply:

1. **Multi-step ceremonies** — OTP, WebAuthn/passkeys, anything with a challenge
   that round-trips. Next _"dispatches Server Actions one at a time per client"_,
   so two calls in flight serialise. Its own docs say _"use a Route Handler for
   non-mutation requests"_ and _"do not rely on `Promise.all`"_.
2. **Cancellation.** Actions have no `AbortSignal`
   ([#81418](https://github.com/vercel/next.js/issues/81418),
   [#74443](https://github.com/vercel/next.js/issues/74443),
   [#56278](https://github.com/vercel/next.js/issues/56278)).
3. **Webhooks and cron.** They are not a browser; there is no action id to POST to.
4. **Native clients.** A mobile app can call an endpoint. It cannot call a Server
   Action.
5. **Uploads over 1 MB.** Actions are POST-only with a 1 MB body limit by default.

The trade you accept: Server Actions get an automatic Origin/Host comparison from
the framework. Route Handlers get **nothing** — the refresh route does that check by
hand, and so must yours.

## Reads never go through an action

Even though it works, it is wrong. TanStack is explicit that Server Actions are
_"a good fit for **mutations**"_ but must not be a `queryFn`, because they _"run
serially… queries stuck in a pending state"_. A read that needs to be parallel,
cancellable or cached belongs in a Server Component or a Route Handler.

And on the shape of the whole thing — there is a fair objection worth recording:
if your action does nothing but forward to a backend endpoint, the action is
overhead. It earns its place when it _also_ validates input, checks the session,
touches cookies, or invalidates cache. When it does none of those, call the API
from the client through `apiFetch`.
