'use server';

import { getLocale } from 'next-intl/server';

import { actionClient, authAction } from '~/server/actions/client';
import { clearSession, setSession } from '~/server/session';

import { api } from '~/api/api';

import { redirect } from '~/i18n/navigation';

import { signInSchema } from '~/schemas/user';

/**
 * Sign-in and sign-out as Server Actions, which is the right shape for a
 * *single-step* credential exchange: one request, one cookie write, one redirect.
 *
 * ## Where the line is
 *
 * Multi-step ceremonies — OTP, WebAuthn/passkeys, anything with a challenge that
 * has to round-trip — belong in Route Handlers instead, and this is not a style
 * preference. Next dispatches Server Actions **one at a time per client**, so a
 * ceremony that needs two calls in flight (or a call cancelled when the user
 * navigates away) serialises or hangs. Actions also cannot be aborted: there is
 * no `AbortSignal`. A Route Handler is a plain HTTP endpoint with none of those
 * constraints. See docs/auth.md.
 *
 * ## Why `redirect` is inside the action
 *
 * Cookies cannot be written during Server Component rendering — Next refuses it
 * outright. So the cookie write has to happen in an action or a handler, and
 * redirecting from the same place means the browser lands on the authenticated
 * page with the cookie already set, in one round trip.
 *
 * `redirect()` throws to unwind; `handleServerError` re-throws navigation errors
 * so it is not mistaken for a failure.
 */
export const signInAction = actionClient
  .metadata({ actionName: 'signIn' })
  .inputSchema(signInSchema)
  .action(async ({ parsedInput }) => {
    const result = await api.signInPost(parsedInput);

    await setSession({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      userId: result.id,
    });

    redirect({ href: '/profile', locale: await getLocale() });
  });

/**
 * Uses `authAction` so signing out while already signed out is a no-op rather
 * than an error, and so the session read is shared with the rest of the chain.
 */
export const signOutAction = authAction
  .metadata({ actionName: 'signOut' })
  .action(async () => {
    await clearSession();
    redirect({ href: '/', locale: await getLocale() });
  });
