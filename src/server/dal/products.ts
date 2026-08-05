import 'server-only';

import { cache } from 'react';

import { CACHE_TAGS, CATALOG_REVALIDATE_SECONDS } from '~/server/cache/tags';

import { api } from '~/api/api';

import {
  type ProductFilters,
  PRODUCTS_PAGE_SIZE,
} from '~/schemas/productFilters';

/**
 * The Data Access Layer for the catalog: the only place in the app that decides
 * *how* catalog data is fetched and *how long* it may be cached. Pages call
 * these functions and pass the results down as props.
 *
 * Catalog data is public, so every read here opts into the Data Cache
 * explicitly. Since Next 15 a bare `fetch` is uncached at runtime, which means
 * caching is now something you ask for rather than something you remember to
 * turn off.
 */
export async function getProductList(filters: ProductFilters) {
  /**
   * Not wrapped in React's `cache()`, on purpose. `cache()` memoises on
   * *argument identity*, and `filters` is a fresh object on every call — so the
   * wrapper would add a Map lookup and never hit. Deduplication within a render
   * comes from Next's fetch cache instead, which keys on the URL.
   */
  return api.productsGet(
    {
      q: filters.q,
      category: filters.category,
      sort: filters.sort,
      limit: PRODUCTS_PAGE_SIZE,
      skip: (filters.page - 1) * PRODUCTS_PAGE_SIZE,
    },
    {
      next: {
        revalidate: CATALOG_REVALIDATE_SECONDS,
        tags: [CACHE_TAGS.products],
      },
    },
  );
}

/**
 * `cache()` earns its place here: `generateMetadata` and the page component both
 * need the same product in the same request, the argument is a primitive, and
 * without it the two would be two separate cache lookups.
 */
export const getProduct = cache(async (id: number) =>
  api.productGet(id, {
    next: {
      revalidate: CATALOG_REVALIDATE_SECONDS,
      tags: [CACHE_TAGS.product(id)],
    },
  }),
);

export const getCategories = cache(async () =>
  api.productCategoriesGet({
    next: { revalidate: 3600, tags: [CACHE_TAGS.categories] },
  }),
);
