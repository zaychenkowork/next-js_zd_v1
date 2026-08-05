import * as Sentry from '@sentry/nextjs';

/**
 * Edge runtime SDK, loaded by `src/instrumentation.ts`.
 *
 * Nothing in this template runs on the Edge by default — `proxy.ts` uses the Node
 * runtime in Next 16 — but the file has to exist for the moment something opts
 * in with `export const runtime = 'edge'`, or that code reports nothing.
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
