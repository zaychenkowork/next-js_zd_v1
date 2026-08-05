export const THEMES = ['light', 'dark'] as const;

export type Theme = (typeof THEMES)[number];

/**
 * The theme the server renders. It has to be a constant, not a guess: the
 * server cannot read `prefers-color-scheme` or `localStorage`, so any attempt
 * to be clever here produces markup that disagrees with the client.
 *
 * The real theme is applied before first paint by `ThemeScript`, which writes
 * `data-theme` on `<html>` — an attribute React does not own, so there is
 * nothing for hydration to mismatch on. See docs/theming.md.
 */
export const DEFAULT_THEME: Theme = 'light';

export function isTheme(value: unknown): value is Theme {
  return THEMES.includes(value as Theme);
}
