import { ErrorState } from '~/components/ErrorState/ErrorState';

import { DEFAULT_LOCALE } from '~/constants/locales';

import '~/styles/globals.css';

/**
 * The *global* 404, for requests that never resolve to a locale at all
 * (`/favicon.ico`-style paths, `/nope`). There is no `app/layout.tsx` in this
 * project — `app/[locale]/layout.tsx` is the root layout — so this file has to
 * render its own `<html>`/`<body>` and import the stylesheet itself.
 *
 * Copy here is intentionally untranslated: outside `[locale]` there is no
 * request locale to translate against, and guessing one from `Accept-Language`
 * would make this route dynamic.
 *
 * Next 16 also offers `app/global-not-found.tsx` for exactly this shape of app,
 * but it still sits behind `experimental.globalNotFound`. This version needs no
 * flag.
 */
export default function GlobalNotFound() {
  return (
    <html lang={DEFAULT_LOCALE}>
      <body>
        <div id="app-root">
          <main style={{ padding: '2rem' }}>
            <ErrorState
              title="Page not found"
              description="The page you are looking for does not exist."
              action={<a href={`/${DEFAULT_LOCALE}`}>Back to home</a>}
            />
          </main>
        </div>
      </body>
    </html>
  );
}
