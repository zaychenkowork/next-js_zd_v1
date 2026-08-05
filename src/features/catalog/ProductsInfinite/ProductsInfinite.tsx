'use client';

import { useTranslations } from 'next-intl';

import { AddToCartButton } from '~/features/catalog/AddToCartButton/AddToCartButton';
import { ProductCard } from '~/features/catalog/ProductCard/ProductCard';
import {
  ProductGrid,
  ProductGridSkeleton,
} from '~/features/catalog/ProductGrid/ProductGrid';

import { Button } from '~/components/ui/Button/Button';

import { useProductsInfiniteQuery } from '~/api/queries/products/useProductsInfiniteQuery';

import type { ProductFilters } from '~/schemas/productFilters';

import styles from './ProductsInfiniteStyles.module.css';

/**
 * The client-owned read. This is the case TanStack Query exists for: the user
 * keeps appending pages, the accumulated list has to survive re-renders and
 * navigation, and no server round trip should throw away what is already on
 * screen.
 *
 * There is no loading state on first paint even though this is a Client
 * Component. The page prefetched page 0 into a throwaway server QueryClient,
 * dehydrated it, and wrapped this subtree in `HydrationBoundary` — so
 * `useInfiniteQuery` finds the data already in the cache and renders it during
 * SSR. `isPending` below is therefore only reachable if the prefetch was skipped.
 *
 * Note what is *not* used: `initialData`. It looks equivalent and is not — it is
 * treated as "totally fresh, as if it were just fetched", and it will never
 * overwrite data already in the cache even when the new value is newer.
 * TanStack's own docs say hydration "does not have these drawbacks". See
 * docs/rsc-and-data-fetching.md.
 */
type ProductsInfiniteProps = {
  filters: Omit<ProductFilters, 'page'>;
};

const ProductsInfinite = ({ filters }: ProductsInfiniteProps) => {
  const t = useTranslations('products');
  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useProductsInfiniteQuery(filters);

  if (isPending) return <ProductGridSkeleton label={t('title')} />;

  const products = data?.pages.flatMap((page) => page.products) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  if (products.length === 0) {
    return <p className={styles.empty}>{t('empty')}</p>;
  }

  return (
    <>
      <p className={styles.count}>{t('count', { count: total })}</p>

      <ProductGrid>
        {products.map((product) => (
          <ProductCard key={product.id} product={product}>
            <AddToCartButton
              productId={product.id}
              disabled={product.stock === 0}
            />
          </ProductCard>
        ))}
      </ProductGrid>

      {hasNextPage ? (
        <div className={styles.more}>
          <Button
            variant="secondary"
            loading={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            {t('loadMore')}
          </Button>
        </div>
      ) : null}
    </>
  );
};

export { ProductsInfinite };
