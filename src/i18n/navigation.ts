import { createNavigation } from 'next-intl/navigation';

import { routing } from '~/i18n/routing';

/**
 * Locale-aware replacements for `next/link` and `next/navigation`. Always
 * import navigation helpers from here rather than from `next/*` directly, so
 * the active locale prefix is preserved automatically.
 *
 * `getPathname` is the server-side helper used to build absolute alternate
 * URLs for `hreflang` metadata and the sitemap.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
