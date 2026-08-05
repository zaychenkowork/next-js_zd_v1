import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';

import { CACHE_TAGS, CATALOG_REVALIDATE_SECONDS } from '~/server/cache/tags';

import { api } from '~/api/api';

import type { Cart, CartLine } from '~/schemas/cart';
import { cartCookieSchema } from '~/schemas/cart';

import { IS_PRODUCTION } from '~/config/env';

/**
 * Cart reads. The cart itself is `{ productId, quantity }[]` in an httpOnly
 * cookie; prices and titles are never stored there, they are always re-read from
 * the catalog. A cart that remembers the price it saw last week is a support
 * ticket waiting to happen.
 */
export const CART_COOKIE = 'zd_cart';

const CART_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: IS_PRODUCTION,
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
} as const;

export const getCartLines = cache(async (): Promise<CartLine[]> => {
  const raw = (await cookies()).get(CART_COOKIE)?.value;
  if (!raw) return [];

  /**
   * Two layers of tolerance, because this value came from the user's browser: a
   * malformed JSON string and a well-formed but wrong-shaped one both degrade to
   * an empty cart rather than throwing on a page the user did not break.
   */
  let decoded: unknown;

  try {
    decoded = JSON.parse(raw);
  } catch {
    return [];
  }

  const parsed = cartCookieSchema.safeParse(decoded);
  return parsed.success ? parsed.data : [];
});

/** Hydrates the stored lines into a renderable cart. */
export const getCart = cache(async (): Promise<Cart> => {
  const lines = await getCartLines();
  if (lines.length === 0) return { items: [], count: 0, total: 0 };

  const products = await Promise.all(
    lines.map((line) =>
      api.productGet(line.productId, {
        next: {
          revalidate: CATALOG_REVALIDATE_SECONDS,
          tags: [CACHE_TAGS.product(line.productId)],
        },
      }),
    ),
  );

  const items = lines.map((line, index) => {
    const product = products[index]!;
    return {
      product,
      quantity: line.quantity,
      lineTotal: Math.round(product.price * line.quantity * 100) / 100,
    };
  });

  return {
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    total:
      Math.round(items.reduce((sum, item) => sum + item.lineTotal, 0) * 100) /
      100,
  };
});

/**
 * Writes the cart cookie. Callable from Server Actions and Route Handlers only —
 * Next refuses cookie writes during Server Component rendering.
 */
export async function writeCartLines(lines: CartLine[]) {
  const store = await cookies();

  if (lines.length === 0) {
    store.delete(CART_COOKIE);
    return;
  }

  store.set(CART_COOKIE, JSON.stringify(lines), CART_COOKIE_OPTIONS);
}
