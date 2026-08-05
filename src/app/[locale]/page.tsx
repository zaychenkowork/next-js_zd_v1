import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AddToCartButton } from '~/features/catalog/AddToCartButton/AddToCartButton';
import { ProductCard } from '~/features/catalog/ProductCard/ProductCard';
import { ProductGrid } from '~/features/catalog/ProductGrid/ProductGrid';

import { Button } from '~/components/ui/Button/Button';

import { getProductList } from '~/server/dal/products';

import { Link } from '~/i18n/navigation';

import styles from './HomePageStyles.module.css';

/**
 * The plain, boring, correct way to read data in the App Router — and the
 * majority of what an app should look like.
 *
 * The page awaits the DAL, gets objects, passes them to components as props.
 * There is no client cache, no `useEffect`, no loading state, no hydration
 * payload for this data, and the products grid ships zero JavaScript except the
 * add-to-cart buttons.
 *
 * The page stays statically rendered (`setRequestLocale` keeps next-intl from
 * forcing it dynamic) and the DAL's `next: { revalidate }` turns it into ISR: the
 * HTML is regenerated in the background at most every five minutes, or on demand
 * when something calls `updateTag('products')`.
 *
 * Compare with /products, which needs the *client* to own the list because the
 * user appends pages to it. That is the exception; this is the rule.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, featured] = await Promise.all([
    getTranslations(),
    getProductList({ q: '', category: '', sort: 'newest', page: 1 }),
  ]);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1>{t('home.title')}</h1>
        <p className={styles.subtitle}>{t('home.subtitle')}</p>
        <Button size="l" render={<Link href="/products" />}>
          {t('home.browse')}
        </Button>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>{t('home.featured')}</h2>

        <ProductGrid>
          {featured.products.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product}>
              <AddToCartButton
                productId={product.id}
                disabled={product.stock === 0}
              />
            </ProductCard>
          ))}
        </ProductGrid>
      </section>
    </div>
  );
}
