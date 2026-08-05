import { infiniteQueryOptions } from '@tanstack/react-query';

import { api } from '~/api/api';

import {
  type ProductFilters,
  PRODUCTS_PAGE_SIZE,
} from '~/schemas/productFilters';

/**
 * Query factory for the catalog. `queryOptions()` / `infiniteQueryOptions()`
 * colocate the key with its `queryFn`, which is what removes the classic bug
 * where a key factory and a fetcher drift apart.
 *
 * There is no `fetcher()` wrapper here, unlike the plain-React template:
 * `apiFetch` already returns validated data rather than a response envelope, so
 * `api.*` can be used as a `queryFn` directly.
 *
 * Note what is *not* here: the product detail query and the category list. Both
 * are owned by the server (RSC + Data Cache + tags, and props respectively), so a
 * client query for either would be a second copy of the same data in a second
 * cache. The rule is one owner per dataset — see docs/state-management.md.
 */
export const productQueries = {
  all: () => ['products'] as const,

  /**
   * The "load more" list. This one *is* client-owned: the first page arrives
   * dehydrated from the server, and every page after it is fetched in the
   * browser, appended, and kept while the user scrolls back and forth.
   */
  infinite: (filters: Omit<ProductFilters, 'page'>) =>
    infiniteQueryOptions({
      queryKey: [...productQueries.all(), 'infinite', filters] as const,
      queryFn: ({ pageParam, signal }) =>
        api.productsGet(
          {
            q: filters.q,
            category: filters.category,
            sort: filters.sort,
            limit: PRODUCTS_PAGE_SIZE,
            skip: pageParam,
          },
          { signal },
        ),
      initialPageParam: 0,
      getNextPageParam: (lastPage) => {
        const nextSkip = lastPage.skip + lastPage.limit;
        return nextSkip < lastPage.total ? nextSkip : undefined;
      },
      meta: { errorToast: true },
    }),
};
