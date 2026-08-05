# Storybook

```bash
pnpm storybook        # dev, port 6006
pnpm build-storybook  # static build into storybook-static/
```

## `@storybook/nextjs-vite`

Not `@storybook/react-vite`. The Next-specific framework supplies working stand-ins
for `next/image`, `next/navigation`, `next/font` and `next/link` — without it a story
for any component rendering an `<Image>` fails on import, which in this app is most of
the feature layer.

The Webpack-based `@storybook/nextjs` still exists; the Vite variant is what Storybook
10 documents for new projects, and it shares Vite with the Vitest setup so there is one
bundler to reason about instead of two.

Telemetry is off (`core.disableTelemetry`) — a template should not send anonymous usage
data from someone else's machine without them opting in.

## The `~` alias has to be declared twice

```ts
async viteFinal(viteConfig) {
  viteConfig.resolve = {
    ...viteConfig.resolve,
    alias: { ...viteConfig.resolve?.alias, '~': fileURLToPath(new URL('../src', import.meta.url)) },
  };
  return viteConfig;
}
```

Vite's native `resolve.tsconfigPaths` does not apply to importers inside a
dot-directory, so `.storybook/preview.tsx` cannot resolve `~/...` without this. Same
class of workaround as `vitest.config.ts` needing its own config.

## Locale and theme are toolbar globals

[`preview.tsx`](../.storybook/preview.tsx) registers two `globalTypes`, so every story
gets a switch for both — and switching locale also flips `dir`.

That is the single most valuable thing this setup does for an app shipping Arabic: the
RTL check becomes two clicks instead of a deploy. Open the Dialog story in `ar` and
watch the popup, footer and close button flip with no `[dir]` selector anywhere.

The decorator mirrors `src/app/providers.tsx`: `NextIntlClientProvider` →
`QueryClientProvider` → `DirectionProvider` → `Tooltip.Provider` → `Toast.Provider`,
plus a `#app-root` div with `isolation: isolate` because Base UI needs an isolated
stacking context for portals and stories portal too.

Messages come from the real `messages/*.json`, so a story showing a raw key is a
missing translation, not a story bug.

One structural detail: the providers live in a real `AppProviders` **component**, not
inline in the decorator. A `Decorator` is a plain function as far as React is
concerned, so calling `useEffect` inside one breaks the rules of hooks — and the
linter is right to say so.

## `stories/` mirrors `src/`

```
src/components/ui/Button/Button.tsx
stories/components/ui/Button/Button.stories.tsx
```

Same convention as `__tests__/`. A component without a story is a missing file rather
than something you have to notice.

## What to put in a story

- **A `Playground`** with `args` and `argTypes`, for poking at props.
- **A comparison story** rendering all variants at once — the fastest way to spot a
  broken token after a palette change.
- **The states that are hard to reach in the app**: `loading`, `disabled`, an error
  message, a long title, an out-of-stock product.

Set `parameters: { controls: { disable: true } }` on render-only stories so the
controls panel does not imply props that are not wired up.

## Feature components: substitute at the boundary

[`ProductCard.stories.tsx`](../stories/features/catalog/ProductCard/ProductCard.stories.tsx)
renders a real feature component — `next/image`, `next/link` and next-intl's
`useFormatter` all work.

What it substitutes is the action slot: a plain `Button` instead of the real
`AddToCartButton`, which calls a Server Action and has no meaning outside a Next
server. That substitution is only possible because `ProductCard` takes its action as
`children` rather than an `onAddToCart` callback — the same design choice that lets it
be a Server Component. Composition buys both.

As a rule: components that call Server Actions or read the DAL do not get stories.
Their behaviour is E2E's job. Everything below them does.

## Interaction testing

Not wired up. If you want it, add `@storybook/addon-vitest` and the `play` function —
the Vitest config is already Vite-based, so the two share a builder. Until then the
same assertions live in `__tests__/`, which is cheaper to run and already in the
`pre-push` hook.
