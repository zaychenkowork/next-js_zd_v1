import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import { routing } from '~/i18n/routing';

/**
 * Per-request i18n configuration, wired into Next.js by `createNextIntlPlugin`
 * in next.config.ts. `requestLocale` comes from the `[locale]` segment.
 *
 * Messages are imported dynamically so only the active locale's dictionary is
 * loaded on the server for a given request.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
