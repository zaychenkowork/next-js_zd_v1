# Auth

## Authorization lives in the Data Access Layer

Not in `proxy.ts`. Not in a layout. Next's own guidance is explicit about both:

> "While Proxy can be useful for initial checks, it should not be your only line of
> defense… as close as possible to your data source"

> "Due to Partial Rendering, be cautious when doing checks in Layouts as these don't
> re-render on navigation"

So the check sits next to the read:

```ts
// src/server/dal/profile.ts
export const getProfile = cache(async () => {
  await requireSession();
  return api.profileGet({ headers: await getAuthHeaders() });
});
```

Every caller of `getProfile` is protected, from any route, on every render. There is
no path that reaches the data without passing the check. The E2E suite asserts it:
requesting `/en/profile` anonymously redirects to `/en/sign-in`.

`proxy.ts` in this template does **routing only** — next-intl's locale prefixing. It
performs no authorization, and the file says so at the top. The reason is
[CVE-2025-29927](https://nvd.nist.gov/vuln/detail/CVE-2025-29927): middleware-based
authorization was bypassable with a crafted header. The lesson is not "middleware is
broken", it is "a single choke point at the edge is the wrong shape for
authorization".

Also worth knowing about the proxy chain:

> "Server Functions are not separate routes in this chain… Always verify
> authentication and authorization inside each Server Function rather than relying on
> Proxy alone."

Which is what `authAction` is for.

## Two questions, two DAL entry points

| Function               | Question                                       | On failure                       |
| ---------------------- | ---------------------------------------------- | -------------------------------- |
| `requireSession()`     | "must be signed in"                            | Redirects to `/sign-in`          |
| `getSession()`         | "is there a session cookie?"                   | Returns `null`, no upstream call |
| `getProfile()`         | "must be signed in, give me the profile"       | Redirects                        |
| `getOptionalProfile()` | "might be signed in, is the token still good?" | Returns `null`                   |

Conflating them is how a header ends up redirecting anonymous visitors. The root
layout uses `getSession()` — the header only needs a boolean, and calling the profile
endpoint there would add an uncached upstream request to every page view for every
signed-in visitor. The sign-in page uses `getOptionalProfile()`, because there the
_token_ has to be valid: a visitor with an expired session should see the form.

## Session storage

One httpOnly cookie holds the session as JSON:

```ts
type Session = { accessToken: string; userId: number };
```

- **httpOnly** so JavaScript on the page cannot read it and an XSS bug cannot
  exfiltrate it. The browser never holds the access token.
- The **user id is part of it** because almost every authenticated write needs it,
  and re-fetching `/auth/me` to learn your own id on every mutation is a request
  nobody should pay for.
- **Parsed with a zod schema on every read.** A cookie is user-controlled input even
  when it is httpOnly — it survives format changes, downgrades and hand-editing. A
  malformed one means "signed out", not "crash the request".
- `maxAge` matches the **refresh** token's lifetime, not the access token's. The
  cookie is not the authority on expiry; the token is, and the API says so by
  answering 401. Expiring the cookie early would lose the user id needed to rotate.
- `sameSite: 'lax'`, not `'strict'`. Strict drops the cookie on any cross-site
  navigation, so following a link from an email lands the user on a signed-out page.
  Lax still blocks cross-site POSTs, which is the attack that matters.

Cookies can only be written from a Server Action or a Route Handler — Next refuses
outright during Server Component rendering ("Setting cookies is not supported during
Server Component rendering"). That is most of why sign-in is an action.

## Sign-in and sign-out

[`src/server/actions/auth.ts`](../src/server/actions/auth.ts). Single-step credential
exchange: one request, one cookie write, one redirect. Redirecting from inside the
action means the browser lands on the authenticated page with the cookie already set,
in one round trip.

`redirect()` throws to unwind. `handleServerError` re-throws navigation errors so a
successful redirect is not mistaken for a failure.

## Token rotation

[`src/app/api/auth/refresh/route.ts`](../src/app/api/auth/refresh/route.ts) — a
**Route Handler**, for three reasons:

1. Next dispatches Server Actions one at a time per client. A refresh that must
   happen _while_ another request is in flight would queue behind it — exactly the
   situation a refresh exists to resolve.
2. Actions have no `AbortSignal`, so a refresh cannot be cancelled.
3. A native mobile client can call an endpoint. It cannot call a Server Action.

### Single-flight

Three requests hitting a 401 at once must not each burn a refresh token — with
rotation enabled the second and third are rejected and the user is logged out. An
in-flight promise collapses them into one upstream call:

```ts
let inFlight: Promise<Response> | null = null;

export async function POST() {
  if (!isSameOrigin((await headers()).get('origin'))) {
    return Response.json({ error: 'BAD_ORIGIN' }, { status: 403 });
  }

  inFlight ??= rotate().finally(() => {
    inFlight = null;
  });
  return (await inFlight).clone();
}
```

Two honest limitations:

- **Per-instance.** Two containers, or two lambda invocations, each get their own
  promise. Making it global needs a shared lock (Redis `SET NX`) — the same
  constraint that applies to `revalidateTag` not propagating between replicas.
- **`Set-Cookie` is written in the request context that created the promise.**
  Callers that joined get a 204 with no cookies of their own. Harmless for a browser
  (all three responses share one cookie jar), but a non-browser client must not rely
  on the joined response carrying tokens.

### CSRF

Server Actions get an automatic Origin/Host comparison from the framework — no
tokens involved, just a header check. **Route Handlers get nothing.** The refresh
route does that check by hand, and the E2E suite asserts a cross-origin POST returns 403.

Apply the same check to every state-changing Route Handler you add.

## Wiring the retry

The endpoint exists; nothing calls it automatically, because the right trigger
depends on your token style. Two options:

**Browser-side, on 401.** In `QueryCache.onError`, or as a thin wrapper around
`apiFetch` in the browser branch: POST `/api/auth/refresh`, and if it answers 204,
retry the original call once. The endpoint is already single-flighted so concurrent
401s collapse.

**Do not put it inside `apiFetch`.** On the server the DAL already holds a session,
and a retry loop there is a good way to hammer your own auth service.

## OTP, passkeys, and anything multi-step

Route Handlers, not Server Actions. The constraint is structural, not stylistic:

- Actions are dispatched one at a time per client, so a challenge/response that needs
  two calls in flight serialises.
- There is no cancellation, so abandoning a ceremony leaves it hanging.
- WebAuthn's `navigator.credentials.get()` needs a challenge fetched, then an
  assertion posted — two round trips that must not queue behind each other.

Shape it as `POST /api/auth/otp/request` → `POST /api/auth/otp/verify`, each with its
own zod schema, its own rate limit, and the same Origin check as the refresh route.
Base UI ships an **OTP Field** component for the input.

## What is deliberately not here

No password reset, no email verification, no rate limiting, no account lockout, no
2FA. Those depend entirely on the identity provider, and a template that guesses at
them ships code you have to delete. What is here is the _shape_: session in an
httpOnly cookie, authorization in the DAL, rotation in a Route Handler, CSRF checked
by hand outside Server Actions.

The demo API is dummyjson.com; sign in with `emilys` / `emilyspass`.
