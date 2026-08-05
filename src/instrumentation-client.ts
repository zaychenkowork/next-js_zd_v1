import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

/**
 * Browser SDK. Runs before the app hydrates.
 *
 * `enabled` is explicit rather than relying on "no DSN means inert": that is the
 * SDK's behaviour today, but making it a stated condition is what lets a fresh
 * clone with no Sentry account run without a single console warning.
 *
 * Session Replay is deliberately absent. It is opt-in, adds roughly 43 KB to the
 * client bundle, and records what users type — it belongs in a decision with the
 * people who answer privacy questions, not in a template default. Add
 * `replayIntegration()` from `@sentry/react` when that decision is made.
 */
Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: Number(
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0,
  ),
  /**
   * Off on purpose. With `true` the SDK attaches IP addresses, cookies and
   * request bodies to every event — a GDPR conversation the template should not
   * start on your behalf.
   */
  sendDefaultPii: false,
});

/** Ties client-side navigations into Sentry's tracing timeline. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
