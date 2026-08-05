'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Select } from '@base-ui/react/select';

import { usePathname, useRouter } from '~/i18n/navigation';

import { type Locale, LOCALE_NAMES, LOCALES } from '~/constants/locales';

import styles from './LanguageSwitcherStyles.module.css';

/**
 * Locale switcher built on Base UI's `Select`.
 *
 * `usePathname` / `useRouter` come from `~/i18n/navigation`, not from
 * `next/navigation`: the next-intl versions understand the locale segment, so
 * `pathname` arrives already stripped of `/uk` and `router.replace(pathname, {
 * locale })` re-resolves it under the new locale. Importing the plain Next
 * hooks here is the classic way to end up at `/en/uk/products`.
 *
 * The switch runs inside `startTransition` so the current page stays visible and
 * interactive while the server streams the new locale, instead of blanking out.
 */
export function LanguageSwitcher() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function switchLocale(nextLocale: Locale) {
    /**
     * Search params are read from `window` inside the handler rather than with
     * `useSearchParams`. That hook suspends during prerendering, and this
     * component sits in the root layout of statically rendered pages — reading
     * it here would force the whole shell to bail out to client rendering.
     * Inside a click handler there is always a `window`.
     */
    const search = window.location.search;

    startTransition(() => {
      router.replace(`${pathname}${search}`, { locale: nextLocale });
    });
  }

  return (
    <Select.Root
      items={LOCALE_NAMES}
      value={locale}
      disabled={isPending}
      onValueChange={(value) => {
        if (value) switchLocale(value as Locale);
      }}
    >
      <Select.Trigger
        className={styles.trigger}
        aria-label={t('changeLanguage')}
      >
        <Select.Value className={styles.value} />
        <Select.Icon className={styles.icon}>
          <CaretIcon />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner
          className={styles.positioner}
          sideOffset={6}
          align="end"
        >
          <Select.Popup className={styles.popup}>
            <Select.List className={styles.list}>
              {LOCALES.map((code) => (
                <Select.Item key={code} value={code} className={styles.item}>
                  <Select.ItemIndicator className={styles.indicator}>
                    <CheckIcon />
                  </Select.ItemIndicator>
                  <Select.ItemText className={styles.itemText}>
                    {LOCALE_NAMES[code]}
                  </Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

function CaretIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
      <path d="M11 10H5l3 3.5zm0-4H5l3-3.5z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m2.5 8.5 4 4 7-9" />
    </svg>
  );
}
