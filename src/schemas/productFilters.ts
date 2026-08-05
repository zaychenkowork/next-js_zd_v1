import { z } from 'zod';

export const PRODUCT_SORTS = ['newest', 'priceAsc', 'priceDesc'] as const;

export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const PRODUCTS_PAGE_SIZE = 12;

/**
 * Parses `searchParams` into filters. Every field uses `.catch()` rather than
 * failing: `?page=banana` is a hand-edited or stale URL, and a 500 is the wrong
 * answer to it. Falling back to the default keeps the page rendering and keeps
 * the shape of the object stable for the DAL.
 *
 * Reading filters from the URL rather than from state is deliberate — see
 * docs/rsc-and-data-fetching.md. It makes the list shareable, back-button
 * correct, and server-renderable without any client state at all.
 */
export const productFiltersSchema = z.object({
  q: z.string().trim().catch(''),
  category: z.string().trim().catch(''),
  sort: z.enum(PRODUCT_SORTS).catch('newest'),
  page: z.coerce.number().int().min(1).catch(1),
});

export type ProductFilters = z.infer<typeof productFiltersSchema>;

export function parseProductFilters(
  searchParams: Record<string, string | string[] | undefined>,
): ProductFilters {
  // Repeated params (`?category=a&category=b`) arrive as arrays; the first wins.
  const single = Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  );

  return productFiltersSchema.parse(single);
}
