import { apiFetch } from '~/api/client';

import {
  categoryListSchema,
  productListSchema,
  productSchema,
} from '~/schemas/product';
import type { ProductSort } from '~/schemas/productFilters';
import {
  refreshResponseSchema,
  type SignInInput,
  signInResponseSchema,
  type UpdateProfileInput,
  userProfileSchema,
} from '~/schemas/user';

/**
 * The single flat catalogue of endpoints. Methods are named
 * `<subject><HttpVerb>` — `productsGet`, `profilePut`, `signInPost` — so the
 * name reads as "what + how" and the list stays sortable and greppable. No
 * nesting, no per-domain sub-objects: one file you can read top to bottom to
 * know every network call the app can make.
 *
 * Everything that is *transport* lives in client.ts; everything that is *this
 * backend's dialect* lives here. The `sort` translation below is the example —
 * components and the DAL speak `'priceAsc'`, only this file knows the API wants
 * `sortBy=price&order=asc`.
 *
 * Every method takes an optional `options` so the caller can add what only it
 * knows: `headers` for the session (from the DAL) and `next: { revalidate, tags
 * }` for the Data Cache. See docs/api-layer.md.
 */
export type ApiRequestOptions = Pick<
  RequestInit,
  'headers' | 'signal' | 'cache' | 'next'
> & { timeoutMs?: number };

type ProductsQuery = {
  q?: string;
  category?: string;
  sort?: ProductSort;
  limit: number;
  skip: number;
};

const SORT_PARAMS: Record<ProductSort, { sortBy: string; order: string }> = {
  newest: { sortBy: 'id', order: 'desc' },
  priceAsc: { sortBy: 'price', order: 'asc' },
  priceDesc: { sortBy: 'price', order: 'desc' },
};

export const api = {
  productsGet: (
    { q, category, sort = 'newest', limit, skip }: ProductsQuery,
    options?: ApiRequestOptions,
  ) => {
    /**
     * Three endpoints for one conceptual query, because this backend cannot
     * combine a text search with a category filter. A real API would take both
     * as query parameters — when you swap the backend, this branch collapses to
     * one call and nothing above it changes.
     */
    let path = '/products';
    if (q) path = '/products/search';
    else if (category)
      path = `/products/category/${encodeURIComponent(category)}`;

    return apiFetch(path, {
      ...options,
      schema: productListSchema,
      searchParams: { q, limit, skip, ...SORT_PARAMS[sort] },
    });
  },

  productGet: (id: number, options?: ApiRequestOptions) =>
    apiFetch(`/products/${id}`, { ...options, schema: productSchema }),

  productCategoriesGet: (options?: ApiRequestOptions) =>
    apiFetch('/products/category-list', {
      ...options,
      schema: categoryListSchema,
    }),

  profileGet: (options?: ApiRequestOptions) =>
    apiFetch('/auth/me', { ...options, schema: userProfileSchema }),

  profilePut: (
    id: number,
    data: UpdateProfileInput,
    options?: ApiRequestOptions,
  ) =>
    apiFetch(`/users/${id}`, {
      ...options,
      method: 'PUT',
      body: data,
      schema: userProfileSchema,
    }),

  signInPost: (data: SignInInput, options?: ApiRequestOptions) =>
    apiFetch('/auth/login', {
      ...options,
      method: 'POST',
      body: { ...data, expiresInMins: 60 },
      schema: signInResponseSchema,
    }),

  refreshPost: (refreshToken: string, options?: ApiRequestOptions) =>
    apiFetch('/auth/refresh', {
      ...options,
      method: 'POST',
      body: { refreshToken, expiresInMins: 60 },
      schema: refreshResponseSchema,
    }),
} as const;
