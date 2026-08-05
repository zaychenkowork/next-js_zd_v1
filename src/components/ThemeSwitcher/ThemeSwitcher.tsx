'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { useThemeStore } from '~/store/useThemeStore';

import styles from './ThemeSwitcherStyles.module.css';

/**
 * Which icon is visible is decided by CSS matching `[data-theme]` on `<html>`,
 * not by reading `theme` from the store. That is what keeps this component
 * hydration-safe: the server has no way to know the user's theme, so any
 * JS-driven icon choice would render one glyph on the server and the other on
 * the client.
 *
 * The effect exists only to bring the store in line with the theme the
 * pre-hydration script already applied, for code that reads `theme` in JS.
 */
export function ThemeSwitcher() {
  const t = useTranslations('nav');
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const syncFromDocument = useThemeStore((state) => state.syncFromDocument);

  useEffect(() => {
    syncFromDocument();
  }, [syncFromDocument]);

  return (
    <button
      type="button"
      className={styles.button}
      onClick={toggleTheme}
      aria-label={t('toggleTheme')}
    >
      <SunIcon className={styles.sun} />
      <MoonIcon className={styles.moon} />
    </button>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </svg>
  );
}
