import * as Sentry from '@sentry/nextjs';

/**
 * Server-side instrumentation entry point. Next calls `register()` once per
 * runtime before any request is handled, which is why the SDK is initialised
 * here rather than in a module that happens to be imported early.
 *
 * The two runtimes get separate config files because they are different SDKs:
 * the Node build can read the filesystem and use OpenTelemetry, the Edge build
 * cannot. Importing the Node config in an Edge function is a build failure, not
 * a runtime warning.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

/**
 * The single hook that catches server-side render errors, Route Handler errors,
 * Server Action errors **and** errors thrown in `proxy.ts`. Without it those are
 * logged to the console and lost.
 *
 * It does not catch anything you handled yourself in a `try/catch` — that is what
 * `reportClientError` (client) and `handleServerError` (actions) are for.
 */
export const onRequestError = Sentry.captureRequestError;
