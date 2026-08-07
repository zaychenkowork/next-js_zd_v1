# Architecture

## The layer graph

```
app → features → components → components/ui
                     ↘ api → store
app, features → server          (server-only: session, DAL, cache, actions)
everything    → i18n, schemas, utils, types, config, constants
```

Imports may only point downwards. This is enforced, not suggested:
`import-x/no-restricted-paths` in [`eslint.config.mjs`](../eslint.config.mjs) fails
the build on a violation, and `pnpm lint` runs on `pre-commit`.

Two of those rules are load-bearing rather than tidiness:

**`components/` may not import `server/`.** A shared component has to be
renderable from either environment. The moment it reaches into the Data Access
Layer it can only ever run on the server — so data fetching belongs one level up,
in `app/` or `features/`, which pass results down as props. This is what keeps
`components/` testable and Storybook-able without a request context. It is also
why `MainLayout` takes `cartCount` and `isSignedIn` as props instead of reading
cookies itself.

**`server/` must not be reachable from a Client Component.** Every client-side
layer lists it as forbidden, and the [`server-only`](https://www.npmjs.com/package/server-only)
package is the second line of defence — it turns a violation into a build error
even if the import slips past the linter.

## What lives where

| Folder                                                     | Contains                                                                  | Rule of thumb                                                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/app/`                                                 | Routing only: pages, layouts, route handlers, metadata                    | If it is not a Next file convention, it does not belong here                                        |
| `src/features/`                                            | Feature-specific composites — a product card, a cart line, a sign-in form | Used by one feature                                                                                 |
| `src/components/`                                          | Shared composites — layouts, error states, switchers                      | Used by two or more features                                                                        |
| `src/components/ui/`                                       | Presentational primitives on Base UI                                      | No stores, no API. Text arrives already translated — exceptions: `ToastList`, `ControlledTextField` |
| `src/server/`                                              | `session.ts`, `dal/`, `cache/`, `actions/`                                | Server-only, `import 'server-only'` at the top                                                      |
| `src/api/`                                                 | `client.ts` (transport), `api.ts` (endpoints), `queries/`                 | Isomorphic; knows nothing about auth                                                                |
| `src/store/`                                               | Zustand stores                                                            | Client UI state only — see [state-management.md](./state-management.md)                             |
| `src/schemas/`                                             | zod schemas and the types inferred from them                              | One source of truth per shape                                                                       |
| `src/assets/`                                              | `icons/` (SVG → React components), `images/`, `fonts/`                    | Imported by components; `public/` is only for files whose URL is the contract                       |
| `src/i18n/`, `src/config/`, `src/constants/`, `src/types/` | Leaves of the graph                                                       | No upward imports, ever                                                                             |

## The promotion rule

A component starts as close to its consumer as possible and moves up only when a
second consumer appears:

1. Needed in one feature → `src/features/<feature>/<Component>/`
2. Needed in two or more → `src/components/<Component>/`
3. Purely presentational and reusable anywhere → `src/components/ui/<Component>/`

Moving up is a rename plus an import update. Moving _down_ almost never happens,
which is why the default is to start low. `LanguageSwitcher` and `ThemeSwitcher`
sit in `src/components/` because the header is not their only plausible consumer;
`AddToCartButton` sits in `src/features/catalog/` because it never will be.

There is no `widgets/` layer. The plain-React template tried the FSD split and
found that two homes for components was a source of confusion rather than
clarity — `features/` plus the promotion rule covers the same ground with one
decision instead of two.

## `features/` and not `app/`

Route folders in `app/` are _routing_, not architecture. Putting components there
couples them to a URL, makes colocated files invisible to the layer rules, and
means a component cannot be reused on a second route without moving files.
`app/[locale]/products/page.tsx` should read like a table of contents: parse
params, call the DAL, render feature components.

## Mirrored trees

Two directories mirror `src/` one-to-one:

```
src/components/ui/Button/Button.tsx
__tests__/components/ui/Button/Button.test.tsx
stories/components/ui/Button/Button.stories.tsx
```

Finding a component's test or story is a path substitution rather than a search,
and a missing test or story is visible as a missing file. See
[testing.md](./testing.md) for why E2E lives in `e2e/` instead.

## Where the interesting decisions are written down

| Question                                  | Document                                               |
| ----------------------------------------- | ------------------------------------------------------ |
| How do I read data?                       | [rsc-and-data-fetching.md](./rsc-and-data-fetching.md) |
| How do I write data?                      | [mutations.md](./mutations.md)                         |
| Which of the four caches am I looking at? | [caching.md](./caching.md)                             |
| Who owns this piece of state?             | [state-management.md](./state-management.md)           |
| How does the HTTP layer work?             | [api-layer.md](./api-layer.md)                         |
| Forms and validation                      | [forms.md](./forms.md)                                 |
| Sessions, authorization, tokens           | [auth.md](./auth.md)                                   |
| Tokens, dark mode, RTL                    | [theming.md](./theming.md)                             |
| Where do images and SVGs go?              | [assets.md](./assets.md)                               |
| Base UI conventions                       | [ui-kit.md](./ui-kit.md)                               |
| Naming, commits, env                      | [conventions.md](./conventions.md)                     |
