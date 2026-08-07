import 'server-only';

import {
  createSafeActionClient,
  isNavigationError,
  returnServerError,
} from 'next-safe-action';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';

import { getSession, type Session } from '~/server/session';

import { isApiError, RESPONSE_VALIDATION_FAILED } from '~/api/errors';

import { IS_PRODUCTION } from '~/config/env';

/* -----------------------------------------------------------------------------
 * The two action clients every mutation in the app is built from.
 *
 * ## Why every write goes through here
 *
 * A `'use server'` export is a public HTTP endpoint. Nothing stops a caller from
 * POSTing arbitrary JSON to it, so an action without input validation and an
 * authorization check is an open door — and the ids are obfuscated, not secret
 * (GHSA-955p-x3mx-jcvp, Moderate, 2026-07-21). `actionClient` makes validation
 * unskippable and `authAction` makes the session check unskippable.
 *
 * ## `serverError` is a translation key, not a sentence
 *
 * `handleServerError` returns things like `'errors.unauthorized'`. The client
 * funnel (`reportClientError`) runs it through `t()`. Returning a localised string from
 * the server instead would mean the server has to know the user's locale for
 * every error, and the same message could never be reused by a mobile client.
 *
 * ## What the client is never told
 *
 * Only the mapped key crosses the boundary. Stack traces, upstream URLs and
 * database messages stay on the server and go to Sentry — which is the whole
 * point of the `handleServerError` hook: next-safe-action calls it "the
 * authoritative place for server-side observability".
 * -------------------------------------------------------------------------- */

/** Maps an internal failure onto a message the user is allowed to see. */
const messageKeyFor = (error: Error): string => {
  if (!isApiError(error)) return 'errors.generic';

  if (error.status === 401) return 'errors.unauthorized';
  if (error.status === 403) return 'errors.forbidden';
  if (error.status === 404) return 'errors.notFound';
  if (error.status === 0) return 'errors.network';
  if (error.code === RESPONSE_VALIDATION_FAILED) return 'errors.generic';

  return 'errors.generic';
};

export const actionClient = createSafeActionClient({
  /**
   * Every action declares a name. It costs one line and it is what turns a
   * Sentry issue list from "Error in POST /products" into something you can act
   * on, and what makes the middleware below able to tag spans.
   */
  defineMetadataSchema: () => z.object({ actionName: z.string().min(1) }),

  handleServerError: (error, { metadata, clientInput, ctx }) => {
    /**
     * `redirect()` and `notFound()` work by throwing. Swallowing them here would
     * turn a successful redirect into a generic error toast. next-safe-action
     * filters these before calling us, but the guard is cheap and the failure
     * mode is confusing enough to be worth being explicit about.
     */
    if (isNavigationError(error)) throw error;

    Sentry.captureException(error, {
      tags: { actionName: metadata?.actionName ?? 'unknown' },
      extra: {
        /**
         * Input is only attached outside production. It is user-submitted data
         * and can contain passwords, addresses or card details; `sendDefaultPii`
         * is off for the same reason.
         */
        clientInput: IS_PRODUCTION ? '[redacted]' : clientInput,
        userId: (ctx as { session?: Session } | undefined)?.session
          ? 'authenticated'
          : 'anonymous',
      },
    });

    if (!IS_PRODUCTION) {
      // The mapped key is deliberately vague; during development the real cause
      // needs to be one glance away.
      console.error(`[action:${metadata?.actionName ?? 'unknown'}]`, error);
    }

    return messageKeyFor(error);
  },
});

/**
 * For everything that touches user data. The session check runs *before* the
 * handler, so a forgotten `requireSession()` inside a handler cannot become a
 * data leak.
 *
 * `returnServerError` short-circuits with a typed value and bypasses
 * `handleServerError` — an unauthenticated call is an expected outcome, not an
 * exception worth a Sentry event.
 */
export const authAction = actionClient.use(async ({ next }) => {
  const session = await getSession();

  if (!session) {
    return returnServerError('errors.unauthorized');
  }

  return next({ ctx: { session } });
});
