'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

import { ErrorState } from '~/components/ErrorState/ErrorState';

import { DEFAULT_LOCALE } from '~/constants/locales';

import '~/styles/globals.css';

/**
 * Last-resort boundary: it replaces the root layout, which is why it renders
 * `<html>`/`<body>` and cannot use translations, providers or the app chrome —
 * by the time this renders, the layout that would have supplied them is the
 * thing that failed.
 *
 * Sentry's Next.js SDK documents this file as required for capturing
 * root-layout render errors; without it those failures are invisible.
 */
type GlobalErrorProps = {
  error: Error & { digest?: string };
};

export default function GlobalError({ error }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang={DEFAULT_LOCALE}>
      <body>
        <div id="app-root">
          <main style={{ padding: '2rem' }}>
            <ErrorState
              title="Unexpected error"
              description="We have been notified and are looking into it."
              action={<a href={`/${DEFAULT_LOCALE}`}>Back to home</a>}
            />
          </main>
        </div>
      </body>
    </html>
  );
}
