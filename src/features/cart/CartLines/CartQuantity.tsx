'use client';

import { useTranslations } from 'next-intl';
import { useOptimisticAction } from 'next-safe-action/hooks';

import { Button } from '~/components/ui/Button/Button';

import { setCartQuantityAction } from '~/server/actions/cart';

import { reportActionError } from '~/api/reportClientError';

import styles from './CartQuantityStyles.module.css';

/**
 * A quantity stepper with an optimistic update.
 *
 * `useOptimisticAction` rather than `useMutation`: nothing about this data lives
 * in the TanStack cache, so there would be nothing for a mutation cache to
 * invalidate. The cart is server state, read from a cookie by the DAL — the
 * Server Action's response already carries a re-rendered page, so the only thing
 * missing is covering the network latency, which is exactly what
 * `optimisticState` does.
 *
 * `reportActionError` and not `reportClientError`: hook errors arrive as a result
 * envelope, and the server has already sent this failure to Sentry through
 * `handleServerError`. Only the toast is missing.
 */
type CartQuantityProps = {
  productId: number;
  quantity: number;
  max: number;
};

const CartQuantity = ({ productId, quantity, max }: CartQuantityProps) => {
  const t = useTranslations('cart');

  const { execute, optimisticState, isPending } = useOptimisticAction(
    setCartQuantityAction,
    {
      currentState: { quantity },
      updateFn: (_state, input) => ({ quantity: input.quantity }),
      onError: ({ error }) => reportActionError(error),
    },
  );

  const current = optimisticState.quantity;
  const upperBound = Math.max(1, Math.min(max, 99));

  return (
    <div className={styles.stepper}>
      <Button
        variant="secondary"
        size="s"
        aria-label={t('decrease')}
        disabled={isPending && current <= 0}
        onClick={() => execute({ productId, quantity: current - 1 })}
      >
        −
      </Button>

      <output className={styles.value} aria-live="polite">
        {current}
      </output>

      <Button
        variant="secondary"
        size="s"
        aria-label={t('increase')}
        disabled={current >= upperBound}
        onClick={() => execute({ productId, quantity: current + 1 })}
      >
        +
      </Button>
    </div>
  );
};

export { CartQuantity };
