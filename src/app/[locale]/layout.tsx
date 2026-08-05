import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Providers } from '~/app/providers';

import { MainLayout } from '~/components/layouts/MainLayout/MainLayout';
import { ThemeScript } from '~/components/layouts/ThemeScript';

import { getCartLines } from '~/server/dal/cart';
import { getSession } from '~/server/session';

import { routing } from '~/i18n/routing';

import { CLIENT_ENV } from '~/config/env';

import { type Locale, LOCALE_DIRECTIONS } from '~/constants/locales';

import '~/styles/globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  variable: '--font-sans',
  display: 'swap',
});

/**
 * Pre-renders every locale at build time. Combined with `setRequestLocale`
 * below this keeps pages statically rendered instead of falling back to
 * dynamic rendering — next-intl requires the explicit call, it cannot infer it.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });

  return {
    metadataBase: new URL(CLIENT_ENV.NEXT_PUBLIC_APP_URL),
    title: {
      default: t('title'),
      template: `%s — ${t('title')}`,
    },
    description: t('subtitle'),
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(
        routing.locales.map((code) => [code, `/${code}`]),
      ),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // `params` is untrusted input — a request for /xx/ must 404, not render with
  // a broken locale.
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const direction = LOCALE_DIRECTIONS[locale as Locale];

  /**
   * The chrome's two pieces of live state are read here, not inside `MainLayout`,
   * because `components/` is not allowed to reach into `server/`.
   *
   * Both reads are deliberately the *cheapest* form of the question:
   *
   *  - `getSession()` reads the cookie and stops. The header only needs a
   *    boolean, and calling the profile endpoint here would add an uncached
   *    upstream request to every page view for every signed-in visitor.
   *  - `getCartLines()` reads the cookie too, not the hydrated cart. The badge
   *    needs a count; joining each line with its current price would be one
   *    request per cart item, on every page.
   *
   * The cost, stated plainly: touching cookies in the root layout makes **every**
   * route dynamic, because this layout wraps all of them — you can see it in
   * `next build` output. That is the price of a server-rendered cart badge, and it
   * is usually the right trade: the catalog data these pages render is still
   * served from the tagged Data Cache, so a dynamic render does not mean an
   * upstream request.
   *
   * If static HTML for the catalog matters more than the badge, the two ways out
   * are: move these reads into the pages that show them, or enable
   * `cacheComponents` and put the badge behind `<Suspense>` so the shell
   * prerenders and only the badge streams. docs/caching.md has both recipes.
   */
  const [session, cartLines] = await Promise.all([
    getSession(),
    getCartLines(),
  ]);

  return (
    <html lang={locale} dir={direction} className={inter.variable}>
      <body>
        {/* Must stay the first child of <body>: it applies the stored theme
            before the first paint. */}
        <ThemeScript />

        <NextIntlClientProvider>
          <Providers direction={direction}>
            <MainLayout
              isSignedIn={session !== null}
              cartCount={cartLines.reduce(
                (sum, line) => sum + line.quantity,
                0,
              )}
            >
              {children}
            </MainLayout>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
