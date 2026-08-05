import { getTranslations } from 'next-intl/server';

import { LanguageSwitcher } from '~/components/LanguageSwitcher/LanguageSwitcher';
import { ThemeSwitcher } from '~/components/ThemeSwitcher/ThemeSwitcher';

import { Link } from '~/i18n/navigation';

import styles from './MainLayoutStyles.module.css';

/**
 * The app chrome. A **Server Component** — it renders inside `Providers` (a
 * Client Component), and children of a client component are still rendered on the
 * server, so nothing here ships to the browser except the two switchers that
 * genuinely need interactivity.
 *
 * It fetches nothing. `cartCount` and `isSignedIn` are read by
 * `app/[locale]/layout.tsx` and passed in, because the layer rules forbid
 * `components/` from importing `server/` — and that rule is the reason this file
 * can be rendered in a test or a Storybook story without a request context.
 */
type MainLayoutProps = {
  children: React.ReactNode;
  cartCount: number;
  isSignedIn: boolean;
};

export async function MainLayout({
  children,
  cartCount,
  isSignedIn,
}: MainLayoutProps) {
  const t = await getTranslations();

  return (
    <>
      <a className={styles.skipLink} href="#main">
        {t('common.skipToContent')}
      </a>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand}>
            zd
          </Link>

          <nav className={styles.nav} aria-label={t('nav.mainNavigation')}>
            <Link href="/" className={styles.navLink}>
              {t('nav.home')}
            </Link>
            <Link href="/products" className={styles.navLink}>
              {t('nav.products')}
            </Link>
            <Link href="/cart" className={styles.navLink}>
              {t('nav.cart')}
              {cartCount > 0 ? (
                <span className={styles.badge}>{cartCount}</span>
              ) : null}
            </Link>
            <Link
              href={isSignedIn ? '/profile' : '/sign-in'}
              className={styles.navLink}
            >
              {isSignedIn ? t('nav.account') : t('nav.signIn')}
            </Link>
          </nav>

          <div className={styles.actions}>
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main id="main" className={styles.main}>
        {children}
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>{t('common.footerNote')}</div>
      </footer>
    </>
  );
}
