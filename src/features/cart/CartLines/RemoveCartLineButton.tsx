'use client';

import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';

import { Button } from '~/components/ui/Button/Button';
import { showToast } from '~/components/ui/Toast/showToast';

import { removeFromCartAction } from '~/server/actions/cart';

import { reportActionError } from '~/api/reportClientError';

/**
 * The plainest possible action call: `useAction`, no optimistic state, no client
 * cache. The success toast is raised at the call site rather than centrally,
 * because only this component knows the message is "removed from cart" — the
 * hybrid rule from docs/api-layer.md (errors centralised, successes local).
 */
type RemoveCartLineButtonProps = {
  productId: number;
};

const RemoveCartLineButton = ({ productId }: RemoveCartLineButtonProps) => {
  const t = useTranslations('cart');

  const { execute, isPending } = useAction(removeFromCartAction, {
    onSuccess: () => showToast({ titleKey: 'cart.removed', type: 'success' }),
    onError: ({ error }) => reportActionError(error),
  });

  return (
    <Button
      variant="ghost"
      size="s"
      loading={isPending}
      onClick={() => execute({ productId })}
    >
      {t('remove')}
    </Button>
  );
};

export { RemoveCartLineButton };
