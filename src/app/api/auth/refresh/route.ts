import { headers } from 'next/headers';

import {
  clearSession,
  getRefreshToken,
  getSession,
  setSession,
} from '~/server/session';

import { api } from '~/api/api';

import { CLIENT_ENV } from '~/config/env';

/**
 * Token rotation as a **Route Handler**, not a Server Action. Three reasons, and
 * they are the same reasons OTP and passkey flows belong here too:
 *
 *  1. Next dispatches Server Actions one at a time per client. A refresh that
 *     has to happen *while* another request is in flight would queue behind it —
 *     which is exactly the situation a refresh exists to resolve.
 *  2. Actions have no `AbortSignal`, so a refresh cannot be cancelled.
 *  3. A native mobile client can call this endpoint. It cannot call a Server
 *     Action.
 *
 * ## Single-flight
 *
 * Three requests hitting a 401 at once must not each burn a refresh token —
 * with rotation enabled, the second and third would be rejected and log the user
 * out. The in-flight promise below collapses them into one upstream call.
 *
 * Two honest limitations, both worth knowing before shipping:
 *
 *  - It is per-instance. Two containers, or two lambda invocations, each get
 *    their own promise. Making it global needs a shared lock (Redis `SET NX`) —
 *    the same constraint that applies to `revalidateTag` not propagating between
 *    replicas.
 *  - The `Set-Cookie` headers are written in the request context that *created*
 *    the promise. Callers that joined it get a 204 with no cookies of their own,
 *    which is harmless for a browser (all three responses go to the same cookie
 *    jar) but means a non-browser client must not rely on the joined response
 *    carrying tokens.
 *
 * ## CSRF
 *
 * Server Actions get an automatic Origin/Host comparison from the framework.
 * Route Handlers get nothing — so the check is done by hand here. Without it any
 * site could make a visitor's browser rotate their tokens.
 */
let inFlight: Promise<Response> | null = null;

function isSameOrigin(origin: string | null) {
  if (!origin) return false;

  try {
    return (
      new URL(origin).origin === new URL(CLIENT_ENV.NEXT_PUBLIC_APP_URL).origin
    );
  } catch {
    return false;
  }
}

async function rotate(): Promise<Response> {
  const [session, refreshToken] = await Promise.all([
    getSession(),
    getRefreshToken(),
  ]);

  if (!session || !refreshToken) {
    await clearSession();
    return Response.json({ error: 'NO_SESSION' }, { status: 401 });
  }

  try {
    const tokens = await api.refreshPost(refreshToken);

    await setSession({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      userId: session.userId,
    });

    // No body: the caller only needs to know it can retry, and the new tokens
    // must never be readable by JavaScript.
    return new Response(null, { status: 204 });
  } catch {
    // A rejected refresh token is terminal. Clearing the cookies here is what
    // stops the client from retrying in a loop.
    await clearSession();
    return Response.json({ error: 'REFRESH_FAILED' }, { status: 401 });
  }
}

export async function POST() {
  if (!isSameOrigin((await headers()).get('origin'))) {
    return Response.json({ error: 'BAD_ORIGIN' }, { status: 403 });
  }

  inFlight ??= rotate().finally(() => {
    inFlight = null;
  });

  const response = await inFlight;

  // Every caller awaits the same `Response` object, and a body can only be read
  // once — so hand out a clone.
  return response.clone();
}
