import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { ProductFiltersPanel } from '~/features/catalog/ProductFilters/ProductFilters';
import { ProductsInfinite } from '~/features/catalog/ProductsInfinite/ProductsInfinite';

import { getCategories } from '~/server/dal/products';

import { productQueries } from '~/api/queries/products/productQueries';
import { getServerQueryClient } from '~/api/queryClient';

import { parseProductFilters } from '~/schemas/productFilters';

import styles from './ProductsPageStyles.module.css';

/**
 * The prefetch + dehydrate + hydrate pattern, end to end.
 *
 * 1. `getServerQueryClient()` makes a throwaway QueryClient for this request. It
 *    renders nothing; a fresh instance per request is what makes it impossible
 *    for one user's data to leak into another's.
 * 2. `prefetchInfiniteQuery` runs the same `queryFn` the browser would, so there
 *    is exactly one definition of how a product page is fetched.
 * 3. `dehydrate()` serialises the cache into the RSC payload.
 * 4. `HydrationBoundary` puts it into the *browser's* QueryClient before
 *    `useInfiniteQuery` first runs — so the list is server-rendered HTML with no
 *    loading state, and "load more" continues from page 1 on the client.
 *
 * Two details that are easy to get wrong:
 *
 * - `prefetchInfiniteQuery`, not `prefetchQuery`. The cache entry for an infinite
 *   query has a `{ pages, pageParams }` shape; prefetching the wrong one leaves
 *   the client refetching page 0 immediately.
 * - `await` before `dehydrate()`. `prefetchQuery` never throws and never
 *   suspends, so forgetting the `await` silently dehydrates an empty cache — the
 *   page still works, it just quietly loses SSR.
 *
 * `Promise.all` because the two reads are independent; sequential `await`s here
 * would add a round trip for no reason.
 */
type ProductsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
}: ProductsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'products' });

  return {
    title: t('title'),
    alternates: {
      canonical: `/${locale}/products`,
    },
  };
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const t = await getTranslations('products');

  // `page` is dropped on purpose: the infinite query owns paging through
  // `pageParam`, and leaving it in the query key would make a filter change and
  // a page change indistinguishable.
  const parsed = parseProductFilters(await searchParams);
  const filters = { q: parsed.q, category: parsed.category, sort: parsed.sort };

  const queryClient = getServerQueryClient();

  const [categories] = await Promise.all([
    getCategories(),
    queryClient.prefetchInfiniteQuery(productQueries.infinite(filters)),
  ]);

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>{t('title')}</h1>

      <ProductFiltersPanel filters={filters} categories={categories} />

      <HydrationBoundary state={dehydrate(queryClient)}>
        <ProductsInfinite filters={filters} />
      </HydrationBoundary>
    </section>
  );
}
