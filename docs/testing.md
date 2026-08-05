# Testing

## Two suites, split by capability rather than taste

|             | Vitest + RTL                               | Playwright                                                |
| ----------- | ------------------------------------------ | --------------------------------------------------------- |
| Lives in    | `__tests__/`, mirroring `src/`             | `e2e/`, flat                                              |
| Environment | jsdom                                      | Real browser, real Next server                            |
| Covers      | API client, schemas, stores, UI primitives | Server Components, Server Actions, cookies, routing, i18n |
| Command     | `pnpm test`                                | `pnpm e2e`                                                |

The split is not a preference. Next's own guidance:

> "Since async Server Components are new to the React ecosystem, Vitest currently
> does not support them… we recommend using E2E tests for async components."

E2E is in a separate directory for a mechanical reason: Playwright drives a browser
while Vitest runs in jsdom, and sharing a directory means one runner picks up the
other's files. Every production Next repository surveyed for this template keeps them
apart — that one is unanimous.

Unit tests, by contrast, mirror `src/`:

```
src/api/client.ts            →  __tests__/api/client.test.ts
src/components/ui/Button/    →  __tests__/components/ui/Button/Button.test.tsx
```

Finding a test is a path substitution, not a search, and a missing test is a missing
file.

## Coverage is an allowlist

```ts
// vitest.config.ts
coverage: {
  include: [
    'src/api/client.ts',
    'src/api/errors.ts',
    'src/schemas/**/*',
    'src/store/**/*',
    'src/components/ui/**/*',
  ],
  thresholds: { lines: 80, statements: 80, branches: 75, functions: 70 },
}
```

Every entry is there because it is genuinely unit testable. Deliberately excluded:

- `src/app/**`, `src/features/**` — async Server Components and Server Actions;
  Playwright's job.
- `src/server/**` — needs a request context (`cookies()`); same.
- `src/constants/**`, `src/config/**` — data, not logic. A threshold over a file of
  constants measures nothing.

A coverage number that includes untestable files is a number nobody trusts, and the
usual response is to lower the threshold until it passes. An allowlist keeps the
threshold meaningful.

## Vitest setup

Three things in [`__tests__/setup/setupTests.ts`](../__tests__/setup/setupTests.ts)
are load-bearing:

**MSW with `onUnhandledRequest: 'error'`.** The alternative (`'warn'`) lets a
component quietly call an endpoint nobody declared and the test still passes — which
is how a suite ends up green while the feature is broken.

**A `ResizeObserver` stub.** jsdom has none, and Base UI's popups measure their anchor
on mount. Without it every Select, Dialog and Tooltip test throws before rendering.

**A `matchMedia` stub.** Same reason.

Env comes from `vitest.config.ts`, not from `.env.local`:

```ts
env: {
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  NEXT_PUBLIC_API_URL: 'https://api.test',
  API_URL: 'https://api.test',
}
```

Next injects `NEXT_PUBLIC_*` at build time; Vitest does not. Without this, every test
that touches the API client fails at module evaluation.

## `renderWithProviders`

[`__tests__/test-utils.tsx`](../__tests__/test-utils.tsx) mirrors
`src/app/providers.tsx` minus the devtools. Two choices worth knowing:

**`retry: false`.** With the app's default of two retries, a test asserting an error
state waits out three failed attempts and usually times out instead of failing with a
useful message.

**Real messages, from `messages/uk.json`.** A mocked `t()` hides the failure where a
key is renamed in one locale and not the others. Using the real dictionary means the
test catches it.

## Test naming

`what + when + expected`, as a sentence:

```ts
it('reports a transport failure as status 0 rather than letting it escape raw', …)
it('falls back to page 1 for page=banana', …)
it('keeps its accessible name while loading and marks itself busy', …)
```

Not `it('works')`, not `it('should render')`. The name is what you read in CI output
at 2am.

## Queries: role and name, never `data-testid`

```ts
screen.getByRole('button', { name: 'Add to cart' });
screen.getByLabelText('Email');
```

A test that finds a control the way a screen reader does fails when the control stops
being reachable — which is exactly when you want to know. `data-testid` passes a test
for a button nobody can use.

Watch out for accidental substring matches: `getByRole('link', { name: 'Product 1' })`
also matches `Product 10`. Use `{ exact: true }`.

## Playwright and Next's test mode

[`playwright.config.ts`](../playwright.config.ts) uses `defineConfig` from
`next/experimental/testmode/playwright.js`, which registers fixtures that stub the
API for requests Next makes **on the server** — RSC reads, Server Actions, Route
Handlers. `page.route` cannot reach those.

```
mswHandlers / msw.use()  →  server-side fetches (RSC, actions, handlers)
page.route()             →  requests the browser makes itself (TanStack "load more")
```

Both appear in [`catalog.spec.ts`](../e2e/catalog.spec.ts), because knowing which tool
reaches which request is the whole trick.

The proxy is opened by `experimental.testProxy` in `next.config.ts`, gated behind
`NEXT_TEST_PROXY=true` which `playwright.config.ts` sets. A normal `pnpm build` never
ships it.

### Six gotchas, all discovered the hard way

Each of these costs an hour if you meet it cold. They are commented in the config too.

1. **`.js` extension is required.** `next/experimental/testmode/` contains both a
   `playwright.js` file and a `playwright/` directory; Node's ESM resolver picks the
   directory and fails with `ERR_UNSUPPORTED_DIR_IMPORT`.
2. **Only `defineConfig` and `test` come from that module.** It is CommonJS
   re-exporting `@playwright/test` and `msw` with `export *`, which Node's CJS lexer
   cannot see through. Import `devices` and `expect` from `@playwright/test`, and
   `http` / `HttpResponse` from `msw`.
3. **`test.use({ mswHandlers })` does not work** with Playwright 1.62 — the option
   fixture arrives `undefined` and throws `mswHandlers is not iterable`. Next declares
   `@playwright/test` `^1.51.1` as a peer, so this is version skew. Use
   `test.beforeEach(({ msw }) => msw.use(...handlers))` instead; that is the same
   mechanism one level lower.
4. **`testMatch` must be set.** `defineConfig` merges Next's defaults, which include
   `testMatch: '{app,pages}/**/*.spec.{t,j}s'` for colocated suites. Left alone it
   wins over `testDir` and nothing is discovered.
5. **`localhost`, not `127.0.0.1`.** Next's dev server treats `/_next/static/**`
   requests from an origin outside `allowedDevOrigins` as cross-origin and answers
   **403** — every chunk fails, the page never hydrates, and every interaction test
   times out with no hint why.
6. **Serial, one worker.** The test-mode stubs are registered against one shared Next
   server. In parallel, one test's handlers can be in place while another test's page
   renders, and the second gets an unstubbed API — a 500 page and a pile of
   unrelated-looking failures.

Two more, smaller:

- The readiness probe points at `/robots.txt`. Every page fetches from the API, and
  during the probe no test is running, so the stubs are not registered and `/`
  answers 500 — Playwright would wait out the full timeout and report a server that
  never started.
- `expect.timeout` is 10s rather than 5s: first-hit route compilation in `next dev`,
  and not-found UI that Next transports to the client rather than server-rendering
  ([#62228](https://github.com/vercel/next.js/issues/62228)), so it appears after
  hydration.

## What the E2E suite actually asserts

Worth reading as a specification of the architecture:

- Server-fetched products render on the home page (pure RSC).
- A product page has its own metadata; an unknown id returns **404** with a localised
  page inside the locale chrome.
- Add-to-cart updates the **server-rendered** badge with no reload — the Server
  Action's response carries a re-rendered payload.
- A filter lands in the URL and the list is shareable.
- "Load more" appends a page **in the browser** and keeps the first page.
- Anonymous `/profile` redirects to `/sign-in` — from the DAL, not the proxy.
- Sign in → profile → sign out.
- Rejected credentials surface the **mapped** key as a toast; the upstream message
  never reaches the user.
- A cross-origin POST to `/api/auth/refresh` returns 403.
- `/` redirects by `Accept-Language`; `/ar` gets `dir="rtl"`.
- Switching locale keeps the current path.
- The theme survives a reload with no flash.

## Commands

```bash
pnpm test              # watch
pnpm test run          # once
pnpm test:coverage     # once, with thresholds
pnpm e2e               # chromium by default
pnpm e2e --project=firefox --project=webkit
pnpm e2e:install       # download browsers, first run only
```

`pre-push` runs `pnpm type-check && pnpm test run`. E2E is not in the hook — it needs
a server and browsers, which belongs in CI.
