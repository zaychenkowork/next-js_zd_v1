import * as rootParams from 'next/root-params';
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import { routing } from '~/i18n/routing';

/**
 * Per-request i18n configuration, wired into Next.js by `createNextIntlPlugin`
 * in next.config.ts.
 *
 * Locale resolution, in priority order:
 *
 * 1. An explicit override passed by the caller, e.g.
 *    `getTranslations({ locale, namespace })` in `generateMetadata`.
 * 2. `next/root-params` — the native way (Next 16.3+) to read the `[locale]`
 *    root segment from any Server Component. This replaces the deprecated
 *    `setRequestLocale` calls that every page had to make.
 * 3. `requestLocale` — resolved from the `x-next-intl-locale` header set by
 *    the next-intl proxy. Needed because `next/root-params` throws in Server
 *    Actions and Route Handlers (actions are not tied to a route), and our
 *    actions call `getLocale()` for locale-aware redirects.
 *
 * Messages are imported dynamically so only the active locale's dictionary is
 * loaded on the server for a given request.
 */
export default getRequestConfig(async ({ locale, requestLocale }) => {
  let candidate: string | undefined = locale;

  if (!candidate) {
    try {
      candidate = await rootParams.locale();
    } catch {
      candidate = await requestLocale;
    }
  }

  const resolved = hasLocale(routing.locales, candidate)
    ? candidate
    : routing.defaultLocale;

  return {
    locale: resolved,
    messages: (await import(`./messages/${resolved}.json`)).default,
  };
});
