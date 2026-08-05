'use server';

import { actionClient } from '~/server/actions/client';
import { revalidateProduct } from '~/server/cache/revalidate';
import { getCartLines, writeCartLines } from '~/server/dal/cart';

import {
  addToCartSchema,
  type CartLine,
  removeFromCartSchema,
  setCartQuantitySchema,
} from '~/schemas/cart';

/* -----------------------------------------------------------------------------
 * Cart mutations. Worth reading once, because the caching behaviour here is the
 * part of the App Router that surprises people most.
 *
 * ## Why there is no "refresh the cart" call
 *
 * The cart lives in a cookie. Writing a cookie inside a Server Action is one of
 * the things Next treats as a revalidation signal on its own: the action's
 * response carries a freshly rendered RSC payload, which the client commits as a
 * seeded navigation. The user sees the new cart in the *same* round trip — no
 * `router.refresh()`, no follow-up fetch, no loading flash. `revalidatePath`,
 * `updateTag`, `refresh()` and `redirect()` all have the same effect.
 *
 * That is the answer to "how do I mutate on the server and have the UI update
 * without reloading the page": you already did.
 *
 * ## Why `updateTag` still appears below
 *
 * The *product* data rendered on the cart page (price, stock) does come from the
 * tagged Data Cache. Expiring that one product's tag makes the same response
 * read its current stock instead of a value cached up to five minutes ago —
 * which matters precisely at the moment someone is deciding to buy it.
 *
 * `revalidateProduct` uses `updateTag` rather than `revalidateTag(tag, 'max')`:
 * `max` is stale-while-revalidate and would let this response serve the old stock.
 * See src/server/cache/revalidate.ts for the full comparison.
 * -------------------------------------------------------------------------- */

const upsertLine = (lines: CartLine[], productId: number, quantity: number) => {
  const existing = lines.find((line) => line.productId === productId);

  if (!existing) return [...lines, { productId, quantity }];

  return lines.map((line) =>
    line.productId === productId
      ? { ...line, quantity: Math.min(line.quantity + quantity, 99) }
      : line,
  );
};

export const addToCartAction = actionClient
  .metadata({ actionName: 'addToCart' })
  .inputSchema(addToCartSchema)
  .action(async ({ parsedInput: { productId, quantity } }) => {
    const lines = await getCartLines();
    await writeCartLines(upsertLine(lines, productId, quantity));

    revalidateProduct(productId);

    return { productId };
  });

export const setCartQuantityAction = actionClient
  .metadata({ actionName: 'setCartQuantity' })
  .inputSchema(setCartQuantitySchema)
  .action(async ({ parsedInput: { productId, quantity } }) => {
    const lines = await getCartLines();

    // Quantity 0 is the same intent as "remove", and letting one action express
    // both keeps the stepper control from needing a branch.
    const next =
      quantity === 0
        ? lines.filter((line) => line.productId !== productId)
        : lines.map((line) =>
            line.productId === productId ? { ...line, quantity } : line,
          );

    await writeCartLines(next);

    return { productId, quantity };
  });

export const removeFromCartAction = actionClient
  .metadata({ actionName: 'removeFromCart' })
  .inputSchema(removeFromCartSchema)
  .action(async ({ parsedInput: { productId } }) => {
    const lines = await getCartLines();
    await writeCartLines(lines.filter((line) => line.productId !== productId));

    return { productId };
  });
