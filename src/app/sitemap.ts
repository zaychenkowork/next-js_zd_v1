import type { MetadataRoute } from 'next';

import { routing } from '~/i18n/routing';

import { CLIENT_ENV } from '~/config/env';

import { DEFAULT_LOCALE } from '~/constants/locales';

/**
 * Static routes only. Anything database-driven (product and category pages)
 * belongs in a second, `async` sitemap generated from the same data source the
 * pages use — see `generateSitemaps` in the Next.js docs once the catalog has a
 * real backend behind it.
 *
 * One entry per route rather than one per locale/route pair, with the locale
 * variants listed as `alternates.languages`. That is the shape Google documents
 * for hreflang: repeating the entry per locale is not wrong, but it multiplies
 * the file for no extra signal.
 */
/**
 * Indexable routes only. `/cart`, `/profile` and `/sign-in` are excluded because
 * they are per-visitor — listing a page in the sitemap while `robots.txt` disallows
 * it is a contradiction crawlers report as an error.
 */
const STATIC_PATHS = ['', '/products'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = CLIENT_ENV.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  const lastModified = new Date();

  return STATIC_PATHS.map((path) => ({
    url: `${baseUrl}/${DEFAULT_LOCALE}${path}`,
    lastModified,
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((locale) => [
          locale,
          `${baseUrl}/${locale}${path}`,
        ]),
      ),
    },
  }));
}
