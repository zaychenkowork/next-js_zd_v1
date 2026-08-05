import { beforeEach, describe, expect, it } from 'vitest';

import { useThemeStore } from '~/store/useThemeStore';

import { STORAGE_KEYS } from '~/constants/storageKeys';
import { DEFAULT_THEME } from '~/constants/theme';

describe('useThemeStore', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    useThemeStore.setState({ theme: DEFAULT_THEME });
  });

  it('starts from the same value the server rendered', () => {
    expect(useThemeStore.getState().theme).toBe(DEFAULT_THEME);
  });

  it('writes the theme to <html> and to storage when set', () => {
    useThemeStore.getState().setTheme('dark');

    expect(useThemeStore.getState().theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('dark');
  });

  it('toggles between the two themes', () => {
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('dark');

    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('adopts the theme the pre-hydration script already applied', () => {
    document.documentElement.dataset.theme = 'dark';

    useThemeStore.getState().syncFromDocument();

    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('falls back to the default when <html> carries an unknown theme', () => {
    document.documentElement.dataset.theme = 'sepia';

    useThemeStore.getState().syncFromDocument();

    expect(useThemeStore.getState().theme).toBe(DEFAULT_THEME);
  });
});
