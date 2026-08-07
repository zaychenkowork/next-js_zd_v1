'use client';

import {
  hasServerError,
  isActionMutationError,
} from '@next-safe-action/adapter-tanstack-query';
import * as Sentry from '@sentry/nextjs';

import { showToast } from '~/components/ui/Toast/showToast';

import { isApiError, RESPONSE_VALIDATION_FAILED } from '~/api/errors';

type ReportErrorOptions = {
  /*
   * i18n key for the toast. Overrides whatever the error itself suggests.
   */
  messageKey?: string;
  /*
   * Set to false for errors that should be recorded but not shown.
   */
  toast?: boolean;
  /*
   * Extra context attached to the Sentry event.
   */
  context?: Record<string, unknown>;
};

/**
 * The single exit point for **handled** client-side errors.
 *
 * Why it has to exist: Sentry captures *unhandled* exceptions automatically (via
 * `onRequestError` on the server and global handlers in the browser), but
 * anything swallowed by a `try/catch` — which is exactly what a failed mutation
 * does — is invisible to it. So every deliberate `catch` on the client funnels
 * through here.
 *
 * The server half of the funnel is `handleServerError` in
 * src/server/actions/client.ts, which is where next-safe-action's own docs put
 * server-side observability.
 *
 * Success messages are deliberately *not* centralised: they are contextual, so
 * they stay at the call site. See docs/api-layer.md.
 *
 * Named `reportClientError` rather than `reportError` to avoid shadowing the
 * browser-global `window.reportError`.
 */
export function reportClientError(
  error: unknown,
  { messageKey, toast = true, context }: ReportErrorOptions = {},
) {
  /**
   * Errors that travelled back from a Server Action were already captured on the
   * server by `handleServerError`, with a stack trace and request context this
   * side will never have. Capturing again would double the event count and add
   * nothing to the issue.
   */
  if (!isActionMutationError(error)) {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  }

  if (toast) {
    showToast({
      titleKey: messageKey ?? resolveMessageKey(error),
      type: 'error',
    });
  }
}

/**
 * The same funnel for next-safe-action's own hooks (`useAction`,
 * `useOptimisticAction`). They report failures through an `onError` callback
 * rather than by throwing, so there is no error object for `reportClientError`
 * to inspect — just the result envelope.
 *
 * Validation errors are not toasted: they belong next to the field that caused
 * them, and a form that shows both an inline message and a toast reads as two
 * separate failures.
 */
export function reportActionError(error: {
  serverError?: unknown;
  validationErrors?: unknown;
}) {
  if (error.serverError === undefined) return;

  showToast({
    titleKey:
      typeof error.serverError === 'string'
        ? error.serverError
        : 'errors.generic',
    type: 'error',
  });
}

/**
 * Picks the message the user sees. Both error channels carry a translation
 * **key** rather than a sentence, which is what lets one funnel serve three
 * locales:
 *
 *   - `ActionMutationError.serverError` — produced by `handleServerError` on the
 *     server and thrown client-side by the TanStack Query adapter;
 *   - `ApiError` — produced by `apiFetch` for direct client-side calls.
 */
function resolveMessageKey(error: unknown): string {
  if (isActionMutationError(error) && hasServerError(error)) {
    return typeof error.serverError === 'string'
      ? error.serverError
      : 'errors.generic';
  }

  if (isApiError(error)) {
    if (error.status === 401) return 'errors.unauthorized';
    if (error.status === 0) return 'errors.network';
    /**
     * A schema mismatch is our bug, not the user's. It still gets the generic
     * message — but it is worth keeping the branch visible, because this is the
     * case where the Sentry event matters far more than the toast.
     */
    if (error.code === RESPONSE_VALIDATION_FAILED) return 'errors.generic';
  }

  return 'errors.generic';
}
