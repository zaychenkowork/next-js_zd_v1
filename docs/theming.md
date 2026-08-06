# Theming, tokens and RTL

## Tokens

[`src/styles/tokens.css`](../src/styles/tokens.css) is the only file with a hex value
in it. Everything else reads `var(--color-*)`.

Two tiers:

```css
/* numeric scale — the palette */
--color-grey-500: #767676;
--color-blue-500: #37a3fa;

/* semantic aliases — what components actually use */
--color-bg: var(--color-primary-0);
--color-text: var(--color-grey-950);
--color-accent: var(--color-blue-500);
--color-danger: var(--color-red-500);
```

A component reads the **semantic** tier. That is what makes dark mode a
redefinition of the numeric scale rather than a second stylesheet:

```css
[data-theme='dark'] {
  --color-grey-950: #ffffff; /* the scale inverts */
  --color-grey-100: #1a1a1a;
  /* --color-text still points at --color-grey-950; nothing else changes */
}
```

The same applies to spacing (`--space-1..8`), radius, shadow, motion
(`--duration-*`, `--easing-standard`), layout (`--layout-max-width`) and z-index
(`--z-dropdown` → `--z-toast`). If you find yourself writing `z-index: 9999`, add a
token instead.

## Dark mode without a flash

[`next-themes`](https://github.com/pacocoursey/next-themes) owns the browser theme.
The provider in [`src/app/providers.tsx`](../src/app/providers.tsx) is configured to:

- write the resolved theme to `data-theme` on `<html>`;
- use the namespaced `zd:theme` local-storage key;
- follow `prefers-color-scheme` until the user chooses a theme;
- keep the preference synchronized between tabs.

Its inline script applies the stored or system theme before the browser paints. CSS
then uses `[data-theme='dark']` to redefine the scale. The `<html>` element keeps
`suppressHydrationWarning` because that pre-hydration attribute change is deliberate.

Why an inline script and not a cookie: a cookie read in the layout also avoids the
flash, but calls `cookies()` and so opts every page out of static rendering. For a
preference this cheap, the script is the better trade.

If you add a strict CSP, pass its nonce to `ThemeProvider`. Reading that nonce from
`headers()` makes the layout request-time rendered, so only add it together with the
CSP implementation.

### Why the switcher's icon is CSS

```css
.moon {
  display: none;
}
:global([data-theme='dark']) .sun {
  display: none;
}
:global([data-theme='dark']) .moon {
  display: block;
}
```

The server cannot know the user's theme, so any JS-driven icon choice would render
one glyph on the server and the other on the client — a hydration mismatch on every
page. Letting CSS decide means the markup is identical on both sides. Code that needs
the value in JavaScript uses `useTheme`; `theme` and `resolvedTheme` are unavailable
until the component mounts.

## CSS Modules, and the naming rule

One module per component, named `<ComponentName>Styles.module.css`, next to the
component:

```
src/components/ui/Button/Button.tsx
src/components/ui/Button/ButtonStyles.module.css
```

Class names are `camelCase` and semantic (`.trigger`, `.itemText`, `.skipLink`), not
descriptive of the styling (`.blueBox`).

Global CSS is exactly four files, imported once in
[`globals.css`](../src/styles/globals.css) in this order:

1. `tokens.css` — custom properties
2. `base.css` — reset and document-level rules
3. `typography.css` — the type scale

## Two rules in `base.css` that are not taste

```css
body {
  position: relative;
} /* Base UI: iOS Safari 26+ dialog backdrops */
#app-root {
  isolation: isolate;
} /* Base UI: predictable portal stacking */
```

Both are documented requirements of Base UI's quick-start. Remove either and popups
start stacking unpredictably or backdrops misbehave on iOS. `#app-root` is rendered
by [`providers.tsx`](../src/app/providers.tsx), and the Storybook preview mirrors it.

## RTL

The `ar` locale works by flipping `dir` alone. There is no RTL stylesheet and no
`[dir]` selector anywhere in `src/`. Two rules make that true:

**Logical properties, always.** `margin-inline`, `padding-block`,
`inset-inline-end`, `border-inline-start`, `text-align: start`. Never `left`,
`right`, `margin-left`, `text-align: left`.

**`dir` and `DirectionProvider` are both set explicitly.** Nothing derives this
automatically — Next does not set `dir` on `<html>`, and Base UI's
`DirectionProvider` does not read it from the DOM:

```text
// app/[locale]/layout.tsx
const direction = LOCALE_DIRECTIONS[locale as Locale];

<html lang={locale} dir={direction}>
  <Providers direction={direction}>      → <DirectionProvider direction={...}>
```

Miss the provider and popups keep LTR placement in Arabic while the rest of the page
flips — a bug that looks like a Base UI problem and is not.

The E2E suite asserts `dir="rtl"` for `/ar` and `dir="ltr"` for `/en`, and the
Storybook toolbar has a locale switch so the RTL check is two clicks rather than a
deploy.

## Fonts

`next/font` in the locale layout:

```ts
const inter = Inter({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  variable: '--font-sans',
  display: 'swap',
});
```

Self-hosted and preloaded — no external request, no layout shift, and a strict CSP
stays simple. `typography.css` reads
`font-family: var(--font-sans, var(--font-fallback))`, so the fallback stack applies
in Storybook and in tests where `next/font` is not running.

Arabic is not covered by Inter's Latin/Cyrillic subsets. For production Arabic, add a
second `next/font` call (Noto Sans Arabic or Cairo) and bind it to a second variable
used under `[lang='ar']`.

## Reduced motion

`base.css` collapses animations globally under
`@media (prefers-reduced-motion: reduce)`, so individual components do not need to
handle it. Base UI's transitions are driven by `data-starting-style` /
`data-ending-style` and are covered by the same rule.
