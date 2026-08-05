# next-js_zd_v1

A production template for Next.js 16 App Router, built as a reference
implementation rather than a starter: every architectural decision in it is
written down with its reason, and the tricky ones are covered by tests.

**Stack** — Next 16.3 (App Router, Turbopack) · React 19.2 · TypeScript 6 ·
Base UI 1.7 + CSS Modules · TanStack Query 5 · next-safe-action 8 · zod 4 ·
react-hook-form 7 · Zustand 5 · next-intl 4 (uk / en / ar, RTL) · Sentry 10 ·
Vitest 4 + Playwright 1.62 · Storybook 10

## Quick start

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

The defaults point at [dummyjson.com](https://dummyjson.com), so a fresh clone runs
with real catalog data and a working sign-in (`emilys` / `emilyspass`). Replace
`API_URL` / `NEXT_PUBLIC_API_URL` with your backend — the response shapes are
validated by `src/schemas/*`, so a mismatch fails at the boundary instead of leaking
`undefined` into components.

## The five decisions worth knowing before you write anything

**1. Reads are Server Components.** A page awaits the Data Access Layer and passes
plain objects down as props. No client cache, no loading state. TanStack Query is for
the cases where the _client_ accumulates state the server does not model — infinite
lists, live search — seeded from the server with `prefetch` + `dehydrate` +
`HydrationBoundary`. → [rsc-and-data-fetching.md](./docs/rsc-and-data-fetching.md)

**2. Writes are Server Actions, wrapped.** Every one goes through
`next-safe-action`, which makes input validation and the session check unskippable
and funnels every failure through one `handleServerError`. Multi-step flows (OTP,
passkeys), webhooks and native clients use Route Handlers instead, for reasons that
are structural rather than stylistic. → [mutations.md](./docs/mutations.md)

**3. A Server Action already re-renders the page.** Its response carries a fresh RSC
payload, which the client commits as a seeded navigation. "How do I update the UI
after a mutation without reloading?" usually has no answer to write.
→ [mutations.md](./docs/mutations.md)

**4. One dataset, one owner.** The catalog and cart belong to the server; filters
belong to the URL; the accumulated "load more" list and the theme belong to the
client. Nothing is in two caches. → [state-management.md](./docs/state-management.md)

**5. One HTTP entry point.** `apiFetch` is the only network function — server and
browser, reads and writes, validated by zod at the boundary. No second client, no
axios instance. → [api-layer.md](./docs/api-layer.md)

## Documentation

|                                                             |                                                                  |
| ----------------------------------------------------------- | ---------------------------------------------------------------- |
| [architecture.md](./docs/architecture.md)                   | Layer graph, folder rules, the promotion rule                    |
| [rsc-and-data-fetching.md](./docs/rsc-and-data-fetching.md) | Server Components, the DAL, hydration, why not `initialData`     |
| [mutations.md](./docs/mutations.md)                         | Actions vs Route Handlers, `updateTag`/`revalidateTag`/`refresh` |
| [caching.md](./docs/caching.md)                             | The four caches, tags, `DYNAMIC_SERVER_USAGE`, self-hosting      |
| [state-management.md](./docs/state-management.md)           | Ownership table, what Zustand is for                             |
| [api-layer.md](./docs/api-layer.md)                         | `apiFetch`, `api.ts`, the error funnel, recipes                  |
| [forms.md](./docs/forms.md)                                 | One schema validated twice, i18n keys in validation              |
| [auth.md](./docs/auth.md)                                   | Sessions, authorization in the DAL, refresh, OTP guidance        |
| [theming.md](./docs/theming.md)                             | Tokens, dark mode without a flash, RTL                           |
| [ui-kit.md](./docs/ui-kit.md)                               | Base UI conventions, `data-*` styling, a11y rules                |
| [testing.md](./docs/testing.md)                             | Two suites, coverage policy, Playwright gotchas                  |
| [storybook.md](./docs/storybook.md)                         | `nextjs-vite`, locale/theme toolbars                             |
| [conventions.md](./docs/conventions.md)                     | Naming, no barrels, env, commits, toolchain pins                 |

[AGENTS.md](./AGENTS.md) is the condensed version for AI agents; `CLAUDE.md` imports
it. The block at the top of `AGENTS.md` is generated and re-added by `next dev` —
commit it with your work rather than deleting it.

## Layout

```
src/
├── app/                 routing only — pages, layouts, route handlers, metadata
│   ├── [locale]/        localised routes; this is the root layout
│   └── api/             route handlers (auth refresh, webhooks)
├── features/            feature composites (catalog, cart, auth, profile)
├── components/          shared composites · components/ui/ = Base UI primitives
├── server/              server-only: session, dal/, cache/, actions/
├── api/                 client.ts (transport) · api.ts (endpoints) · queries/
├── store/               Zustand — client UI state only
├── schemas/             zod schemas + inferred types
├── i18n/ config/ constants/ types/ styles/
├── proxy.ts             locale routing only, no authorization
└── instrumentation*.ts  Sentry
__tests__/               mirrors src/ 1:1  (Vitest + RTL)
stories/                 mirrors src/ 1:1  (Storybook)
e2e/                     Playwright — separate on purpose
messages/                uk.json · en.json · ar.json
docs/
```

## Commands

```bash
pnpm dev              # next dev (Turbopack)
pnpm build            # production build
pnpm start            # serve the build

pnpm lint             # eslint, including the layer boundaries
pnpm lint:fix
pnpm format
pnpm type-check

pnpm test             # vitest, watch
pnpm test run         # vitest, once
pnpm test:coverage    # with thresholds
pnpm e2e              # playwright (chromium)
pnpm e2e:install      # download browsers, first run only

pnpm storybook
pnpm build-storybook
```

## What the reference feature covers

`/products` and `/cart` are not filler — each demonstrates one pattern end to end,
and the E2E suite asserts it:

| Route               | Demonstrates                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| `/`                 | Pure RSC read → props. The default shape for ~90% of pages.                                                    |
| `/products`         | URL-driven filters + `prefetchInfiniteQuery` → `dehydrate` → `HydrationBoundary`, then client-side "load more" |
| `/products/[id]`    | RSC detail, `generateMetadata` with hreflang, 404 from an upstream 404                                         |
| `/cart`             | Server-owned state in an httpOnly cookie, mutated by Server Actions, optimistic stepper                        |
| `/sign-in`          | react-hook-form + zod + `next-safe-action`, server errors mapped onto fields                                   |
| `/profile`          | Authorization in the DAL, `refresh()` on uncached data                                                         |
| `/api/auth/refresh` | Route Handler with single-flight rotation and a hand-written CSRF check                                        |

## Known limitations, stated up front

- **Every route is dynamic.** The root layout reads cookies for the cart badge, which
  makes every route it wraps dynamic. The Data Cache still serves the upstream reads,
  so this costs cached HTML rather than cached data. Two documented ways to get static
  rendering back are in [caching.md](./docs/caching.md).
- **`cacheComponents` is off.** The deploy target is undecided and it needs a shared
  cache handler on multi-instance self-hosting. The enable checklist is in
  [caching.md](./docs/caching.md).
- **`notFound()` UI is not server-rendered.** The 404 _status_ is correct and the UI
  arrives in the same response, but the initial HTML body is empty — upstream
  [vercel/next.js#62228](https://github.com/vercel/next.js/issues/62228).
- **No CI, no CSP, no rate limiting.** Out of scope by request. The CSP nonce hook is
  noted in [theming.md](./docs/theming.md); the rate-limit boundary is
  [auth.md](./docs/auth.md).
- **The refresh single-flight lock is per-instance.** Multi-replica needs a shared
  lock — see [auth.md](./docs/auth.md).
