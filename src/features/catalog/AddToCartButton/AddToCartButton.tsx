'use client';

import { useTranslations } from 'next-intl';
import { mutationOptions } from '@next-safe-action/adapter-tanstack-query';
import { useMutation } from '@tanstack/react-query';

import { Button } from '~/components/ui/Button/Button';

import { addToCartAction } from '~/server/actions/cart';

import { productQueries } from '~/api/queries/products/productQueries';

/**
 * The `useMutation` + Server Action combination, and the one place in this
 * template where it is the right tool.
 *
 * The rule: reach for `useMutation` when the mutation has to invalidate data the
 * *client* owns. Adding to cart changes stock, and stock is rendered by the
 * infinite product list living in the TanStack cache — so something has to tell
 * that cache it is stale. The Server Action handles the server side on its own
 * (see src/server/actions/cart.ts); `meta.invalidates` handles the client side.
 *
 * When there is no client-side cache involved — the cart page, the profile form —
 * `useActionState` or next-safe-action's own hooks are less machinery for the
 * same result. See docs/mutations.md for the decision table.
 *
 * `mutationOptions` from the official adapter is what bridges the two worlds: a
 * safe action never throws, it *returns* `{ data, serverError, validationErrors }`,
 * and `useMutation` needs a promise that rejects. The adapter converts a result
 * envelope into a thrown `ActionMutationError`, which the global
 * `MutationCache.onError` then turns into a toast.
 */
type AddToCartButtonProps = {
  productId: number;
  disabled?: boolean;
};

const AddToCartButton = ({ productId, disabled }: AddToCartButtonProps) => {
  const t = useTranslations('products');

  const mutation = useMutation(
    mutationOptions(addToCartAction, {
      meta: {
        errorToast: true,
        successToast: 'cart.added',
        invalidates: [productQueries.all()],
      },
    }),
  );

  return (
    <Button
      size="s"
      fullWidth
      loading={mutation.isPending}
      disabled={disabled}
      onClick={() => mutation.mutate({ productId, quantity: 1 })}
    >
      {t('addToCart')}
    </Button>
  );
};

export { AddToCartButton };
