# Conventions

Everything here is either enforced by tooling or written down because it is a decision
rather than a preference. If a rule has no reason attached, it does not belong.

## Language

**Everything in the repository is in English** — code, comments, commit messages,
docs, branch names, PR descriptions. The only non-English strings are the contents of
`src/i18n/messages/*.json`.

## TypeScript

**`type`, not `interface`.** `type` covers unions, intersections, mapped and
conditional types with one keyword. The one exception is declaration merging — module
augmentation, as in [`src/types/tanstack-query.d.ts`](../src/types/tanstack-query.d.ts).

**No `any`.** `unknown` plus a narrowing guard says the same thing honestly.
`@typescript-eslint/no-explicit-any` is off in the config only because Base UI's own
generics require it at a few call sites; do not read that as permission.

**Infer types from schemas.** A zod schema is the source of truth; the type comes from
`z.infer`. Two hand-maintained shapes for one payload drift.

**Strict everything.** `strict`, `noUnusedLocals`, `noUnusedParameters`,
`noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`.

`jsx: 'react-jsx'` is pinned in `tsconfig.json` because Next 16 rewrites the value on
every build if it disagrees — a fresh clone's tsconfig should not change under the
developer on first `pnpm build`.

## No barrel files

There is no `index.ts` re-exporting a folder anywhere in `src/`. Import the file:

```ts
import { Button } from '~/components/ui/Button/Button';
```

Barrels defeat tree-shaking, create import cycles that are hard to see, and slow the
TypeScript server on a large project. `no-restricted-imports` fails a build on
`~/components`, `~/api`, `~/store`, `~/features`, `~/server` as import targets.

## Naming

| Thing            | Convention                                 | Example                             |
| ---------------- | ------------------------------------------ | ----------------------------------- |
| Component file   | `PascalCase.tsx`, in a folder of its own   | `Button/Button.tsx`                 |
| CSS module       | `<ComponentName>Styles.module.css`         | `ButtonStyles.module.css`           |
| Hook             | `use<Thing>.ts`                            | `useProductsInfiniteQuery.ts`       |
| Store            | `use<Thing>Store.ts`                       | `useDrawerStore.ts`                 |
| Zustand selector | `select<Thing>`                            | `selectIsDrawerOpen`                |
| API method       | `<subject><HttpVerb>`                      | `productsGet`, `profilePut`         |
| Query factory    | `<domain>Queries`                          | `productQueries`                    |
| Server Action    | `<verb><Subject>Action`                    | `addToCartAction`                   |
| Constant         | `SCREAMING_SNAKE_CASE`                     | `CACHE_TAGS`, `PRODUCTS_PAGE_SIZE`  |
| Test file        | `<Name>.test.ts(x)`                        | `client.test.ts`                    |
| Story file       | `<Name>.stories.tsx`                       | `Button.stories.tsx`                |
| Icon file        | `lowercase.svg` in `src/assets/icons/`     | `chevron.svg` → `Icons.Chevron`     |
| Image file       | `kebab-case.<ext>` in `src/assets/images/` | `empty-cart.png`                    |
| Boolean prop     | `is` / `has` / no prefix for state         | `isSignedIn`, `loading`, `disabled` |

Components are declared and then exported at the bottom:

```tsx
const Button = (props: ButtonProps) => {
  /* ... */
};

export { Button };
export type { ButtonProps };
```

App Router files are the exception — Next requires default exports there.

## Import order

Enforced by `simple-import-sort` with groups matching the layer graph:

```
side effects
react, next*, other packages
~/app
~/features
~/components
~/server
~/api
~/store
~/hooks
~/i18n
~/schemas · ~/utils · ~/types · ~/config · ~/constants
~/assets
relative
styles
```

`pnpm lint:fix` sorts them. Do not hand-order imports.

`~/assets` is last of the aliases because it is the only group that is data rather
than code. It also has to be an alias import: a relative path to an icon misses the
type declaration in `src/types/svg.d.ts` and silently degrades to `any` — see
[assets.md](./assets.md#two-constraints-on-the-svg-file-itself).

## Environment variables

**`process.env` is read in exactly one place**: [`src/config/env.ts`](../src/config/env.ts).
A `no-restricted-syntax` rule fails the build anywhere else, with an allowlist for the
files that genuinely run before the app (`next.config.ts`, `instrumentation*.ts`,
`sentry.*.config.ts`, `playwright.config.ts`, `vitest.config.ts`, `.storybook/**`,
`e2e/**`).

The schemas live apart from the parsing, in [`src/schemas/env.ts`](../src/schemas/env.ts).
There are two of them, because Next exposes the halves differently:

- `clientEnvSchema` — `NEXT_PUBLIC_*` only, parsed at module scope.
- `serverEnvSchema` — everything else, parsed **lazily** in `getServerEnv()`. That
  function is not a stylistic choice: `src/api/client.ts` is isomorphic and imports
  both halves, so this module lands in the browser bundle, where parsing server keys
  at module scope would throw. Splitting it into a `server-only` module instead would
  mean two `apiFetch` implementations, which the api layer forbids.

Property access is written out literally on purpose:

```text
process.env.NEXT_PUBLIC_APP_URL   ✔ inlined by Next at build time
process.env[key]                  ✘ silently undefined in the browser
const env = process.env           ✘ silently undefined in the browser
```

Next inlines `NEXT_PUBLIC_*` by static analysis, so neither a dynamic lookup nor a
whole-object read produces a value in the browser — and neither produces an error.
The literals are pinned to the schemas with
`satisfies Record<keyof z.input<typeof schema>, string | undefined>`, so a key added
to a schema and forgotten in the parser is a type error rather than a runtime
failure. Parse errors are formatted by zod's own `z.prettifyError`.

A missing or malformed variable fails loudly at startup rather than surfacing as
`undefined` three layers deep.

## `config`, `constants`, and what goes where

Three neighbours that are easy to confuse:

| Module            | Holds                                                                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `~/config/env`    | What the _deployment_ supplies. Raw, validated, unopinionated.                                                                                                                    |
| `~/config/config` | What the _app_ is: `APP_NAME`, `APP_VERSION`, contact details, feature flags. Same for every deployment, or derived from `CLIENT_ENV` into something the app actually asks about. |
| `~/constants/*`   | Domain values scoped to one feature — page sizes, filter keys.                                                                                                                    |

[`CONFIG`](../src/config/config.ts) is imported by Client Components, which gives it
two hard rules: **never call `getServerEnv()` there** (a server key read at module
scope throws in the browser), and **do not re-export `CLIENT_ENV` values verbatim** —
`CONFIG.API_URL` alongside `CLIENT_ENV.NEXT_PUBLIC_API_URL` is two names for one value
and the call sites will drift. A variable earns a place in `CONFIG` when the wrapping
adds meaning, the way `ENABLE_DEVTOOLS` does.

`APP_VERSION` comes from `package.json` through the `env` key in `next.config.ts`.
That key is marked legacy in the Next docs and rightly so for real environment
variables — but this is a build-time constant, and the alternative (importing
`package.json` from application code) ships the dependency list to the browser.

## Comments

Comment the **why**, never the what. A comment that restates the code is noise that
goes stale.

Worth a comment: a non-obvious constraint ("Base UI requires `isolation: isolate`
here"), a rejected alternative and its reason ("not `useState` — TanStack's docs say
React discards the client if it suspends"), an upstream bug with a link, a security
consideration.

Not worth a comment: `// increment the counter`.

## Commits

Conventional Commits, enforced by commitlint on `commit-msg`:

```
feat(cart): add optimistic quantity stepper
fix(auth): reject cross-origin refresh requests
docs(caching): explain DYNAMIC_SERVER_USAGE
chore(deps): bump next to 16.3.0
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`,
`chore`, `revert`. Header limit is 120 characters. Subject in the imperative, no
trailing period.

## Git hooks

| Hook         | Runs                                                        |
| ------------ | ----------------------------------------------------------- |
| `pre-commit` | `lint-staged` — eslint `--fix` and prettier on staged files |
| `commit-msg` | `commitlint`                                                |
| `pre-push`   | `pnpm type-check && pnpm test run`                          |

E2E is not in a hook: it needs a server and browsers, which is CI's job.

## Toolchain pins, and why they are not the newest

Neither of these is caution for its own sake — both are hard blocks.

**TypeScript 6.0.3, not 7.** `typescript-eslint@8.66` caps its peer at `<6.1.0`, and
the `next.config.ts` loader does not work with TypeScript 7's native compiler
([discussion #95633](https://github.com/microsoft/TypeScript/discussions/95633)). Next
itself pins 6.0.2 internally.

**ESLint 9.39.5, not 10.** `eslint-plugin-react@7.37.5` (2025-04-03) caps its peer at
`^9.7` and comes in transitively through `eslint-config-next`. Until that ships a
release supporting ESLint 10, 9.x is the ceiling.

Also: `next lint` was removed in Next 16. `pnpm lint` runs `eslint .` directly.

## Node and package manager

```json
"packageManager": "pnpm@11.20.0",
"engines": { "node": ">=22.13.0" }
```

`.nvmrc` pins 24.13.1 for local development.

pnpm 11 **no longer reads the `pnpm` field in `package.json`** — settings live in
[`pnpm-workspace.yaml`](../pnpm-workspace.yaml). That is where `allowBuilds` grants
postinstall permission to the packages that need it (`esbuild`, `@swc/core`, `msw`,
`unrs-resolver`, `@parcel/watcher`, `@sentry/cli`). Without it, `public/mockServiceWorker.js`
is never generated and MSW fails at runtime with no clear message.

## Error reporting

Sentry is entirely optional. With no DSN the SDK stays inert and the template runs
normally, so a fresh clone needs no Sentry account. Swap the DSN for a self-hosted
Sentry or GlitchTip and nothing in the code changes.

Where reports come from:

| Source                                                  | Captured by                                  |
| ------------------------------------------------------- | -------------------------------------------- |
| Server render, Route Handler, Server Action, `proxy.ts` | `onRequestError` in `src/instrumentation.ts` |
| Client render error below the locale layout             | `[locale]/error.tsx`                         |
| Root layout render error                                | `app/global-error.tsx`                       |
| Handled client errors (`catch`, failed mutations)       | `reportClientError`                          |
| Server Action failures                                  | `handleServerError`                          |

`sendDefaultPii: false` everywhere: with `true` the SDK attaches IP addresses, cookies
and request bodies to every event — a GDPR conversation the template should not start
on your behalf. Action input is attached to Sentry events **outside production only**,
for the same reason.

Session Replay is deliberately absent: opt-in, roughly 43 KB on the client, and it
records what users type. Add `replayIntegration()` from `@sentry/react` when that
decision has been made with the people who answer privacy questions.

Two Turbopack notes for `withSentryConfig`: the plugin's `webpack.*` options have no
effect, so source maps upload through `useRunAfterProductionCompileHook` instead; and
`tunnelRoute` is left off because Sentry does not auto-exclude the tunnel from the
proxy matcher under Turbopack, so enabling it means adding a negative matcher to
`proxy.ts` by hand.
