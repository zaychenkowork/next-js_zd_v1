'use client';

import { create } from 'zustand';

import { STORAGE_KEYS } from '~/constants/storageKeys';
import { DEFAULT_THEME, isTheme, type Theme } from '~/constants/theme';

/**
 * Theme state. Deliberately *not* wrapped in zustand's `persist` middleware,
 * which is what the plain-React template uses.
 *
 * `persist` reads storage synchronously while the store module evaluates. In the
 * browser that module evaluates during hydration, so the very first client
 * render would see `dark` while the server had rendered `light` — a hydration
 * mismatch on every component that reads `theme`. The App Router version splits
 * the two jobs instead:
 *
 *   - the *visible* theme is applied before paint by `ThemeScript`, straight to
 *     `document.documentElement.dataset.theme`;
 *   - this store carries the value for JS that needs it, starting from the same
 *     constant the server used and catching up in an effect
 *     (`syncFromDocument`).
 *
 * Server Components never read this store — they cannot, and they should not
 * need to. See docs/theming.md.
 */
type ThemeState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  syncFromDocument: () => void;
};

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;

  try {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  } catch {
    // Safari in private mode throws on write. The theme still applies for this
    // session, it just will not survive a reload — not worth an error toast.
  }
}

function readAppliedTheme(): Theme {
  const applied = document.documentElement.dataset.theme;
  return isTheme(applied) ? applied : DEFAULT_THEME;
}

export const useThemeStore = create<ThemeState>()((set, get) => ({
  theme: DEFAULT_THEME,

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },

  toggleTheme: () => {
    get().setTheme(get().theme === 'dark' ? 'light' : 'dark');
  },

  syncFromDocument: () => set({ theme: readAppliedTheme() }),
}));

export const selectTheme = (state: ThemeState) => state.theme;
