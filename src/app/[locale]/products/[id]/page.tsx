import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';

import { AddToCartButton } from '~/features/catalog/AddToCartButton/AddToCartButton';

import { Button } from '~/components/ui/Button/Button';

import { getProduct } from '~/server/dal/products';

import { isApiError } from '~/api/errors';

import { Link } from '~/i18n/navigation';
import { routing } from '~/i18n/routing';

import { CURRENCY } from '~/constants/currency';

import styles from './ProductPageStyles.module.css';

/**
 * Pure RSC. No client cache, no `useQuery`, no hydration payload — the data is
 * fetched on the server and passed straight into markup. This is what ~90% of
 * reads in an App Router app should look like; the infinite list on /products is
 * the exception, not the rule.
 *
 * `getProduct` is called twice — once by `generateMetadata`, once by the page —
 * and results in one request. React's `cache()` in the DAL deduplicates it
 * within the render, and the Data Cache would too.
 */
type ProductPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

/**
 * ## Why there is no `generateStaticParams` here
 *
 * There was, and it broke the route. `generateStaticParams` asks Next to treat
 * the page as statically generated, but the root layout reads `cookies()` for the
 * cart badge — and a prerender that touches request data fails with
 * `DYNAMIC_SERVER_USAGE`, a 500 with no useful message in production. The two are
 * mutually exclusive under the classic (non-Cache-Components) model.
 *
 * So every route in this app is dynamic, consistently. That is much less bad than
 * it sounds: the upstream reads are still served from the tagged Data Cache, so a
 * dynamic render usually makes no network call at all.
 *
 * To get statically rendered product pages, pick one first:
 *
 *  1. Remove the cookie reads from `app/[locale]/layout.tsx` (move the badge into
 *     a client island, or drop it), then add back:
 *
 *       export async function generateStaticParams() {
 *         const { products } = await api.productsGet({ limit: 100, skip: 0 });
 *         return products.map(({ id }) => ({ id: String(id) }));
 *       }
 *
 *  2. Or enable `cacheComponents` in next.config.ts, which is designed for
 *     exactly this shape: a prerendered shell with the cookie-reading parts
 *     streamed in behind `<Suspense>`.
 *
 * docs/caching.md walks through both.
 */
async function loadProduct(rawId: string) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  try {
    return await getProduct(id);
  } catch (error) {
    // A 404 from upstream is a missing page, not a broken one. Anything else is
    // a real failure and belongs in error.tsx and Sentry.
    if (isApiError(error) && error.status === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const product = await loadProduct(id);

  return {
    title: product.title,
    description: product.description.slice(0, 160),
    alternates: {
      canonical: `/${locale}/products/${product.id}`,
      /**
       * hreflang for the *specific* page, not the site root. Google needs every
       * localised variant of this URL listed, and it must be reciprocal — which
       * is why it is generated from `routing.locales` rather than written by hand.
       */
      languages: Object.fromEntries(
        routing.locales.map((code) => [
          code,
          `/${code}/products/${product.id}`,
        ]),
      ),
    },
    openGraph: {
      title: product.title,
      images: [{ url: product.thumbnail }],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;

  const [product, t, format] = await Promise.all([
    loadProduct(id),
    getTranslations('products'),
    getFormatter(),
  ]);

  return (
    <article className={styles.page}>
      <Button
        variant="ghost"
        size="s"
        className={styles.back}
        render={<Link href="/products" />}
        nativeButton={false}
      >
        {t('backToList')}
      </Button>

      <div className={styles.layout}>
        <Image
          src={product.thumbnail}
          alt={product.title}
          width={640}
          height={640}
          className={styles.image}
          sizes="(max-width: 800px) 100vw, 480px"
          // The single most impactful image on the page: opt it out of lazy
          // loading so it is not discovered after hydration.
          priority
        />

        <div className={styles.details}>
          <h1 className={styles.title}>{product.title}</h1>

          <p className={styles.price}>
            {format.number(product.price, {
              style: 'currency',
              currency: CURRENCY,
            })}
          </p>

          <p className={styles.stock}>
            {product.stock > 0
              ? t('inStock', { count: product.stock })
              : t('outOfStock')}
          </p>

          <p className={styles.description}>{product.description}</p>

          <div className={styles.action}>
            <AddToCartButton
              productId={product.id}
              disabled={product.stock === 0}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
