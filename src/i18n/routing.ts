import { defineRouting } from 'next-intl/routing';

import { DEFAULT_LOCALE, LOCALES } from '~/constants/locales';

/**
 * `localePrefix: 'always'` — every locale, including the default one, carries
 * its prefix (`/uk/...`, `/en/...`, `/ar/...`).
 *
 * Chosen for an e-commerce front end: unambiguous `hreflang` and canonical
 * URLs, one sitemap entry per locale, predictable CDN cache keys, and no
 * duplicate-content pair between `/` and `/uk`. The alternative
 * (`'as-needed'`, default locale without a prefix) produces shorter URLs but
 * needs careful canonical handling to avoid SEO duplicates.
 *
 * Switching strategy is a one-line change here — see docs/i18n.md.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
});
