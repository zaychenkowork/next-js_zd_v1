import { z } from 'zod';

import type { Product } from '~/schemas/product';

/**
 * The cart is stored server-side, in an httpOnly cookie, and mutated only
 * through Server Actions. That is the shape vercel/commerce uses too (a server
 * cart id plus `updateTag`), and it is what makes the cart survive a reload,
 * work with JavaScript disabled, and stay impossible to tamper with from the
 * console.
 *
 * The client store (Zustand) holds none of this — only the drawer's open/closed
 * state. See docs/state-management.md for the ownership rule.
 */
export const cartLineSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(99),
});

export type CartLine = z.infer<typeof cartLineSchema>;

/**
 * Cookie contents are user-controlled input: anyone can hand-edit the value.
 * The cap keeps a crafted cookie from turning one page view into hundreds of
 * upstream requests.
 */
export const cartCookieSchema = z.array(cartLineSchema).max(50);

/**
 * Plain `z.number()`, not `z.coerce.number()`. These actions are only ever called
 * with typed objects from TypeScript, and `coerce` would set the schema's *input*
 * type to `unknown` — which propagates into `useOptimisticAction`'s `updateFn`
 * and loses type safety exactly where an off-by-one is easy to write.
 *
 * Switch to `z.coerce` only if an action is wired to a bare `<form action={...}>`,
 * where every field arrives as a string.
 */
export const addToCartSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(99).default(1),
});

export const setCartQuantitySchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(0).max(99),
});

export const removeFromCartSchema = z.object({
  productId: z.number().int().positive(),
});

export type CartItem = {
  product: Product;
  quantity: number;
  lineTotal: number;
};

export type Cart = {
  items: CartItem[];
  count: number;
  total: number;
};
