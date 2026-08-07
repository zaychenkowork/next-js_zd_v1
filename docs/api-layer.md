# The API layer

## One entry point

There is exactly one HTTP function in the app:
[`apiFetch`](../src/api/client.ts). Server Components, the DAL, Server Actions,
Route Handlers and TanStack `queryFn`s all go through it. No axios instance, no
second "server version", no `apisauce`-plus-`fetch` split.

```
apiFetch (transport: URL, JSON, errors, validation, timeouts)
   ↑
api.ts   (this backend's dialect: paths, params, schemas)
   ↑
DAL / queries / actions
```

## Two base URLs, one client

The only thing that differs between environments is where the request goes:

```ts
const IS_SERVER = typeof window === 'undefined';

function resolveBaseUrl() {
  return IS_SERVER ? getServerEnv().API_URL : CLIENT_ENV.NEXT_PUBLIC_API_URL;
}
```

Two variables because the two callers are not the same client: server-side requests
can use an internal address the browser cannot resolve (a service name, private
DNS), and `API_URL` must never be inlined into the bundle. In most deployments they
hold the same value.

If the API must not be reachable from the browser at all — cookie-only session, no
CORS — point `NEXT_PUBLIC_API_URL` at a Route Handler on your own origin that
forwards. That is a BFF, and it is the only thing that changes.

## What `apiFetch` deliberately does not do

**It never reads `cookies()`.** Two reasons: `next/headers` cannot exist in a module
the browser also bundles, and reading cookies opts the caller out of static
rendering.

So auth is attached explicitly, one layer up:

```ts
// src/server/dal/profile.ts
export const getProfile = cache(async () => {
  await requireSession();
  return api.profileGet({ headers: await getAuthHeaders() });
});
```

In the browser, `credentials: 'include'` lets the browser attach the session cookie
itself. The DAL is the layer that is _supposed_ to know who is asking, so making it
explicit there is a feature rather than noise — and it is what makes `apiFetch`
usable from the client at all.

## `api.ts` — flat, and named for grep

Methods are `<subject><HttpVerb>`: `productsGet`, `profilePut`, `signInPost`. The
name reads as "what + how", the list stays sortable, and one file tells you every
network call the app can make.

Everything that is _transport_ is in `client.ts`; everything that is _this
backend's dialect_ is in [`api.ts`](../src/api/api.ts). The sort translation is the
example — components and the DAL speak `'priceAsc'`, only `api.ts` knows the API
wants `sortBy=price&order=asc`. Swap backends and one file changes.

Every method takes an optional `options` so the caller can add what only it knows:
`headers` for the session, `next: { revalidate, tags }` for the Data Cache.

## Validation at the boundary

`apiFetch` takes a zod schema and parses the response:

```ts
api.productGet(id, {
  next: { revalidate: 300, tags: [CACHE_TAGS.product(id)] },
});
// → apiFetch(`/products/${id}`, { schema: productSchema, ... })
```

Two things this buys:

1. An API that quietly changes shape fails **at the boundary**, with a readable
   error and a Sentry event, instead of three components deep as `Cannot read
properties of undefined`.
2. zod strips unknown keys, so the schema doubles as a projection. The API can
   return thirty fields and the app still depends on eight — "the backend added a
   field" becomes a non-event.

A schema mismatch throws `ApiError` with `code: 'RESPONSE_VALIDATION_FAILED'` and
the HTTP status of the successful response. That combination is the signal that it
is _our_ bug, not the user's.

## One error type

[`ApiError`](../src/api/errors.ts) covers everything, discriminated by `status`:

| `status`                                          | Means                                                      |
| ------------------------------------------------- | ---------------------------------------------------------- |
| `>= 400`                                          | The server answered with a failure                         |
| `0`                                               | No response at all — DNS, connection reset, timeout, abort |
| any, with `code === 'RESPONSE_VALIDATION_FAILED'` | Body did not match the schema                              |

Guards: `isApiError`, `isUnauthorizedError`. One `catch`, one type.

`this.name = 'ApiError'` is set explicitly in the constructor — without it the class
name is lost through transpilation and Sentry groups every API failure under
"Error".

Field-level errors are lifted out of the body into `details` (the common
`{ errors: { email: ['…'] } }` convention). Adjust `readDetails` once, in
`client.ts`, and the form-error mapping keeps working.

## The error funnel

Errors are centralised. Successes are not.

```
                         ┌── MutationCache.onError ──┐
thrown client-side ──────┤                           ├── reportClientError ──→ toast + Sentry
                         └── QueryCache.onError ─────┘

useAction / useOptimisticAction onError ── reportActionError ──→ toast only
                                                                (server already
                                                                 reported it)

server-side ── handleServerError ──→ Sentry + a translation key for the client
```

Why global cache callbacks rather than per-call `onError`: a per-observer callback
fires once per hook instance, so two components sharing one query would show two
toasts for one failure. The global cache fires once per query — which is why v5
removed `onError` from `useQuery` in the first place.

Why `reportClientError` exists at all: Sentry captures _unhandled_ exceptions
automatically, but anything swallowed by a `try/catch` — which is exactly what a
failed mutation does — is invisible to it.

Two details that matter:

- `reportClientError` **skips** `Sentry.captureException` for an `ActionMutationError`.
  That failure was already captured on the server by `handleServerError`, with a
  stack trace this side never sees; capturing again doubles the event count and adds
  nothing.
- `reportActionError` does not toast validation errors. They belong next to the
  field that caused them, and a form showing both an inline message and a toast
  reads as two separate failures.

### Success messages stay at the call site

```text
// declarative, for the common case
meta: { successToast: 'cart.added' }

// or explicit, where only this component knows the wording
onSuccess: () => showToast({ titleKey: 'cart.removed', type: 'success' })
```

This is a deliberate hybrid. Surveying production Next repositories, eight of nine
raise success toasts ad hoc at the call site; only one centralises anything, and
only for errors. Errors are uniform ("something went wrong") and easy to forget, so
they are declarative. Successes are contextual, so they are local.

## `meta` is the declarative surface

Typed in [`src/types/tanstack-query.d.ts`](../src/types/tanstack-query.d.ts):

```ts
meta: {
  errorToast?: boolean;
  successToast?: string;          // i18n key
  invalidates?: QueryKey[];       // client cache
  revalidate?: () => Promise<unknown>;  // server cache, via a Server Action
}
```

`meta.revalidate` is the bridge between the two caches. Invalidating the TanStack
cache does nothing to server-rendered output; a mutation that changes data rendered
by a Server Component declares a Server Action here. A failure in it is reported
but does **not** surface as a failed action — the mutation itself succeeded.

## Query factories

[`src/api/queries/<domain>/<domain>Queries.ts`](../src/api/queries/products/productQueries.ts)
uses `queryOptions()` / `infiniteQueryOptions()`, which colocate the key with its
`queryFn` and remove the classic bug where a key factory and a fetcher drift apart.

There is no `fetcher()` wrapper: `apiFetch` returns validated data rather than a
response envelope, so `api.*` is usable as a `queryFn` directly.

Note what is **absent** from the factory: the product detail query and the category
list. Both are server-owned, so a client query for either would be a second copy of
the same data in a second cache.

## Recipes

### Cookie session (this template's default)

Server: `getAuthHeaders()` in the DAL. Browser: `credentials: 'include'`. Nothing
else to do.

### Bearer token with refresh

`apiFetch` stays unaware. On a 401 from a browser-side call, POST
`/api/auth/refresh` once and retry — the endpoint is already single-flighted. Wire
it in `QueryCache.onError`, or as a retry wrapper around `apiFetch` in the browser
branch. Do **not** put the refresh in `apiFetch` itself: on the server the DAL
already holds a valid session, and a retry loop there is a good way to hammer your
own auth service.

### Per-request tracing header

```ts
api.productsGet(query, { headers: { 'x-request-id': crypto.randomUUID() } });
```

Or set it once in `apiFetch` if every call should carry one — that is the file's
job.
