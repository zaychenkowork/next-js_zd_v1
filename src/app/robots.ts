import type { MetadataRoute } from 'next';

import { CLIENT_ENV } from '~/config/env';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = CLIENT_ENV.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Route Handlers and the per-visitor pages have nothing to offer a crawler,
      // and the cart in particular would put session-specific content in the index.
      //
      // Note the shape: one wildcard for the locale segment and then the page. The
      // `(account)` folder is a **route group**, so it contributes no URL segment —
      // putting the folder name in a pattern here is a silent no-op, and one of the
      // easier mistakes to make with route groups.
      //
      // These pages also carry `robots: { index: false }` in their own metadata.
      // Both matter: robots.txt stops the crawl, the meta tag stops indexing of a
      // URL discovered some other way.
      disallow: ['/api/', '/*/cart', '/*/profile', '/*/sign-in'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
