import { z } from 'zod';

/**
 * The wire contract for the catalog, validated at the boundary by `apiFetch`.
 *
 * Zod strips unknown keys by default, so this doubles as a projection: the API
 * can return thirty fields and the app still only depends on these eight. That
 * is what makes "the backend added a field" a non-event.
 */
export const productSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  price: z.number(),
  rating: z.number(),
  stock: z.number().int(),
  thumbnail: z.string(),
});

export type Product = z.infer<typeof productSchema>;

export const productListSchema = z.object({
  products: z.array(productSchema),
  total: z.number().int(),
  skip: z.number().int(),
  limit: z.number().int(),
});

export type ProductList = z.infer<typeof productListSchema>;

export const categoryListSchema = z.array(z.string());
