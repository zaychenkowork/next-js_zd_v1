/**
 * Every cache tag the app uses. Tags are strings, and strings scattered across
 * a codebase drift — a read tagged `'products'` and an invalidation for
 * `'product'` fail silently, with no error and no invalidation.
 *
 * Next caps a tag at 256 characters and treats them as opaque, so the
 * `entity:id` convention below is purely ours.
 */
export const CACHE_TAGS = {
  products: 'products',
  product: (id: number) => `product:${id}`,
  categories: 'categories',
} as const;

/**
 * How long cached catalog reads stay fresh without an explicit invalidation.
 * Tags handle "this changed now"; this handles "the API changed behind our back".
 */
export const CATALOG_REVALIDATE_SECONDS = 300;
