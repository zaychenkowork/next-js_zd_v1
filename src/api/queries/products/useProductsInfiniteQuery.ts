'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import { productQueries } from '~/api/queries/products/productQueries';

import type { ProductFilters } from '~/schemas/productFilters';

export function useProductsInfiniteQuery(
  filters: Omit<ProductFilters, 'page'>,
) {
  return useInfiniteQuery(productQueries.infinite(filters));
}
