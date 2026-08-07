# The UI kit

## What is in it

| Component                                                                       | Base UI counterpart                            |
| ------------------------------------------------------------------------------- | ---------------------------------------------- |
| [`Button`](../src/components/ui/Button/Button.tsx)                              | `Button`                                       |
| [`TextField`](../src/components/ui/TextField/TextField.tsx)                     | `Field` + `Field.Control`                      |
| [`ControlledTextField`](../src/components/ui/TextField/ControlledTextField.tsx) | — (react-hook-form wrapper)                    |
| [`Dialog`](../src/components/ui/Dialog/Dialog.tsx)                              | `Dialog`                                       |
| [`Tooltip`](../src/components/ui/Tooltip/Tooltip.tsx)                           | `Tooltip`                                      |
| [`Toast`](../src/components/ui/Toast/)                                          | `Toast`                                        |
| [`Spinner`](../src/components/ui/Spinner/Spinner.tsx)                           | — (hand-written)                               |
| [`Icon`](../src/components/ui/Icon/Icon.tsx)                                    | — (SVGR wrapper, see [assets.md](./assets.md)) |
| [`Skeleton`](../src/components/ui/Skeleton/Skeleton.tsx)                        | **none — Base UI has no Skeleton**             |

Base UI 1.7 ships Progress and Meter but nothing for content placeholders, so
`Skeleton` is the one component in the kit with no upstream counterpart. If a
Skeleton lands upstream, that is the file to replace.

Available and unwrapped, for when you need them: `Combobox`, `Autocomplete`,
`Select`, `AlertDialog`, `Drawer`, `Popover`, `Menu`, `NavigationMenu`, `Tabs`,
`Accordion`, `Checkbox`, `RadioGroup`, `Switch`, `Slider`, `NumberField`,
`ScrollArea`, `Avatar`, `Separator`, `Toolbar`, and **`OTP Field`**. `Select` is used
directly in [`LanguageSwitcher`](../src/components/LanguageSwitcher/LanguageSwitcher.tsx)
and [`ProductFilters`](../src/features/catalog/ProductFilters/ProductFilters.tsx)
rather than wrapped, because a select's markup varies too much between uses for a
single wrapper to be worth it.

## Style state with `data-*`, never with a computed class

Base UI puts its state on the DOM:

```css
.trigger[data-popup-open] {
  border-color: var(--color-accent);
}
.item[data-highlighted] {
  background-color: var(--color-bg-subtle);
}
.control[data-invalid] {
  border-color: var(--color-danger);
}
.button[data-disabled] {
  opacity: 0.55;
}
.popup[data-starting-style] {
  opacity: 0;
  scale: 0.96;
}
```

These attributes are a stable part of its API. Deriving the same state in JavaScript
and toggling a class means two sources of truth that disagree during transitions.

Enter/exit animations come from `data-starting-style` / `data-ending-style` and
Base UI's `--transform-origin`, `--anchor-width`, `--available-height` custom
properties. There is no JS animation state to keep in sync.

## `'use client'`: only where it is needed

| File                                         | Directive      | Why                                                                                                                                                      |
| -------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`, `Skeleton`, `Spinner`, `TextField` | none           | No hooks. Stays a **shared** module: a Server Component can render it, and a Client Component importing it pulls it into the client graph automatically. |
| `ControlledTextField`                        | `'use client'` | `useController` + `useTranslations` (schema error keys)                                                                                                  |
| `Dialog`, `Tooltip`                          | `'use client'` | Open state and focus trapping                                                                                                                            |
| `Toast/*`                                    | `'use client'` | `createToastManager()` runs at module scope                                                                                                              |

Adding the directive to a hookless wrapper pushes it into every client bundle for no
reason. Leaving it off a component with hooks is a build error, so the mistake is
one-directional.

## Composition over configuration

`Dialog` exports parts, not a `<Modal title=… body=… />`:

```tsx
<DialogRoot>
  <DialogTrigger render={<Button>Delete</Button>} />
  <DialogContent>
    <DialogTitle>Delete account?</DialogTitle>
    <DialogDescription>This cannot be undone.</DialogDescription>
    <DialogFooter>
      <DialogClose render={<Button variant="secondary">Cancel</Button>} />
    </DialogFooter>
  </DialogContent>
</DialogRoot>
```

`DialogContent` bundles Portal + Backdrop + **Viewport** + Popup, because getting
that nesting wrong is the most common Base UI mistake — `Viewport` is what makes a
tall dialog scroll instead of overflowing the screen, and it is easy to leave out.
Everything else stays visible at the call site.

Named exports rather than a `Dialog.*` object: the layer rules forbid barrel files,
so one import per part is the house style anyway.

For a confirmation that must not be dismissed by a stray Escape or outside click, use
Base UI's `AlertDialog` instead — same parts, different dismissal behaviour.

## `render` instead of `asChild`

Base UI's escape hatch is a `render` prop taking an element (or a function). It
merges props and refs into that element rather than wrapping it:

```tsx
<Button render={<Link href="/products" />}>Browse</Button>
<DialogTrigger render={<Button>Open</Button>} />
```

That is how a button becomes a link without nesting an `<a>` inside a `<button>`.

## Accessibility rules that are enforced by shape

**No `data-testid`.** Tests query by role and accessible name, the way a screen
reader does — so a test fails when the control stops being reachable, which is when
you want to know.

**A loading button keeps its name.** `Button` hides the label visually while the
spinner shows but keeps it in the accessibility tree, sets `aria-busy`, and passes
`focusableWhenDisabled` so a keyboard user can still reach and read it. An
unlabelled control mid-request is a real regression that a visual check misses.

**A tooltip is never the only label.** A control whose only name is its tooltip is
unusable on touch and with a screen reader. `ThemeSwitcher` has both an `aria-label`
and (optionally) a tooltip. The `Tooltip` story and test both assert this.

**Skeletons are `aria-hidden`.** A screen reader announcing eight grey boxes is
noise. The loading state is announced once, by the region that owns it —
`ProductGridSkeleton` puts `aria-busy` and a label on the container, not on each
placeholder.

**One link per card.** [`ProductCard`](../src/features/catalog/ProductCard/ProductCard.tsx)
uses the block-link pattern — the title is the only anchor and its `::after` covers
the card — instead of wrapping the image in a second link to the same page with the
same name. Two identical links per product means a screen reader user hears every
product twice.

## Adding a component

1. `src/components/ui/<Name>/<Name>.tsx` + `<Name>Styles.module.css`.
2. Wrap the Base UI primitive; do not reimplement one that exists.
3. Style through `data-*` and tokens. No hex values, no `left`/`right`.
4. Take an already-translated string for anything user-visible. Two exceptions call
   `t()` at render because they receive i18n **keys**, not copy:
   - `Toast/ToastList.tsx` — the toast manager can only carry keys (callers like a
     query-cache callback or an action's `onError` have no `t`);
   - `TextField/ControlledTextField.tsx` — zod schemas emit validation keys, and
     translating them here keeps every form free of `errorKey` / `translateError`
     glue.
     Every other primitive stays provider-free, which is what lets it render in
     Storybook and in tests without one.
5. Add `__tests__/components/ui/<Name>/<Name>.test.tsx` and
   `stories/components/ui/<Name>/<Name>.stories.tsx`. The mirrored trees make a
   missing one visible.
