import * as Sentry from '@sentry/nextjs';

/**
 * Node runtime SDK, loaded by `src/instrumentation.ts`.
 *
 * `SENTRY_DSN` takes precedence so the server can report to a different project
 * (or a self-hosted instance) than the browser; it falls back to the public DSN
 * for the common single-project setup.
 */
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: Number(
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0,
  ),
  sendDefaultPii: false,
});
