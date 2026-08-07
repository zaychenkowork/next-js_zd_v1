'use client';

import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

import { Icon } from '~/components/ui/Icon/Icon';
import { Icons } from '~/components/ui/Icon/types';

import styles from './ThemeSwitcherStyles.module.css';

/**
 * Which icon is visible is decided by CSS matching `[data-theme]` on `<html>`,
 * not by reading the theme in JavaScript. That is what keeps this component
 * hydration-safe: the server has no way to know the user's theme, so any
 * JS-driven icon choice would render one glyph on the server and the other on
 * the client.
 */
export function ThemeSwitcher() {
  const t = useTranslations('nav');
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      className={styles.button}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label={t('toggleTheme')}
    >
      {/* Both glyphs are always rendered; CSS hides one. No `title` on either —
          the button carries the accessible name, so the icons are decorative. */}
      <Icon type={Icons.Sun} size={18} className={styles.sun} />
      <Icon type={Icons.Moon} size={18} className={styles.moon} />
    </button>
  );
}
