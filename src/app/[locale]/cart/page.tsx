import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { CartLines } from '~/features/cart/CartLines/CartLines';

import { Button } from '~/components/ui/Button/Button';

import { getCart } from '~/server/dal/cart';

import { Link } from '~/i18n/navigation';

import styles from './CartPageStyles.module.css';

/**
 * Reads a cookie, so the route is dynamic — Next opts it out of static rendering
 * the moment `cookies()` is touched, which is correct: a shared cache must never
 * hold one visitor's cart.
 *
 * `robots: { index: false }` for the same reason. A cart page in a search index
 * is either empty or somebody else's.
 */
type CartPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: CartPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'cart' });

  return {
    title: t('title'),
    robots: { index: false, follow: true },
  };
}

export default async function CartPage() {
  const [cart, t] = await Promise.all([getCart(), getTranslations('cart')]);

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>{t('title')}</h1>

      {cart.items.length === 0 ? (
        <div className={styles.empty}>
          <p>{t('empty')}</p>
          <Button
            variant="secondary"
            render={<Link href="/products" />}
            nativeButton={false}
            className={styles.emptyAction}
          >
            {t('continueShopping')}
          </Button>
        </div>
      ) : (
        <CartLines cart={cart} />
      )}
    </section>
  );
}
