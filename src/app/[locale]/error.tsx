'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import * as Sentry from '@sentry/nextjs';

import { ErrorState } from '~/components/ErrorState/ErrorState';

/**
 * Error boundary for everything below the locale layout. It sits *inside* the
 * layout, so `NextIntlClientProvider` is available and the page keeps its
 * chrome — only the failing subtree is replaced.
 *
 * Sentry is called explicitly here. `onRequestError` in instrumentation.ts
 * already reports server-side render failures, but an error thrown while
 * rendering on the client only ever reaches this boundary. Capturing in both
 * places can duplicate an event; missing one loses it entirely.
 */
type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function LocaleError({ error, reset }: ErrorPageProps) {
  const t = useTranslations();

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <ErrorState
      title={t('errors.unexpectedTitle')}
      description={t('errors.unexpectedBody')}
      action={
        <button type="button" onClick={reset}>
          {t('common.retry')}
        </button>
      }
    />
  );
}
