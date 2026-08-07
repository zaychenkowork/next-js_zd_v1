'use client';

import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';

import { Button } from '~/components/ui/Button/Button';

import { signOutAction } from '~/server/actions/auth';

import { reportActionError } from '~/api/reportClientError';

/**
 * The action redirects, so there is no `onSuccess` to hook into — the navigation
 * *is* the success. `isPending` still matters: without it a slow sign-out looks
 * like a dead button.
 */
const SignOutButton = () => {
  const t = useTranslations('auth');

  const { execute, isPending } = useAction(signOutAction, {
    onError: ({ error }) => reportActionError(error),
  });

  return (
    <Button
      variant="secondary"
      size="s"
      loading={isPending}
      onClick={() => execute()}
    >
      {t('signOut')}
    </Button>
  );
};

export { SignOutButton };
