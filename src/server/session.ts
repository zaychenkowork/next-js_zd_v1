import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { z } from 'zod';

import { redirect } from '~/i18n/navigation';

import { IS_PRODUCTION } from '~/config/env';

/**
 * Session access. The `server-only` import at the top is the hard guarantee: if
 * any Client Component ever pulls this file in — directly or through five levels
 * of re-export — the build fails instead of shipping token handling to the
 * browser.
 *
 * Tokens live in httpOnly cookies, so JavaScript on the page cannot read them
 * and an XSS bug cannot exfiltrate them. That is the whole reason the browser
 * never holds the access token in this template.
 *
 * See docs/auth.md.
 */
export const SESSION_COOKIE = 'zd_session';
export const REFRESH_COOKIE = 'zd_refresh';

/**
 * One cookie holds the whole session as JSON rather than one cookie per field.
 * The user id is part of it because almost every authenticated write needs it,
 * and re-fetching `/auth/me` to learn your own id on every mutation is a request
 * nobody should pay for.
 */
export type Session = {
  accessToken: string;
  userId: number;
};

const sessionSchema = z.object({
  accessToken: z.string().min(1),
  userId: z.number().int().positive(),
});

/**
 * `maxAge` matches the *refresh* token's lifetime, not the access token's. The
 * cookie is not the authority on expiry — the token is, and the API says so by
 * answering 401. Expiring the cookie early would only lose the user id needed to
 * rotate the token, turning a refreshable session into a forced sign-in.
 *
 * `sameSite: 'lax'` rather than `'strict'`: strict drops the cookie on any
 * cross-site navigation, so following a link from an email lands the user on a
 * signed-out page. Lax still blocks cross-site POSTs, which is the attack that
 * matters.
 */
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: IS_PRODUCTION,
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
} as const;

/**
 * Wrapped in React's `cache()`, so a layout, a page and three DAL calls in one
 * request read the cookie store once and get the same object. This is
 * per-request memoisation, not caching across requests — `cache()` is scoped to
 * a single render.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  // A cookie is user-controlled input even when it is httpOnly — it survives
  // format changes, downgrades and hand-editing. A malformed one means "signed
  // out", not "crash the request".
  try {
    const parsed = sessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
});

/**
 * The headers that turn an `api.*` call into an authenticated one. `apiFetch`
 * has no idea sessions exist — the DAL passes this in, which keeps the transport
 * layer usable from the browser where the cookie travels automatically.
 *
 * Attaching an `authorization` header also makes Next skip the Data Cache for
 * that request (see `hasUnCacheableHeader` in its patched fetch), so per-user
 * responses cannot end up in a shared cache even by accident.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await getSession();
  return session ? { authorization: `Bearer ${session.accessToken}` } : {};
}

/**
 * Authorization belongs here — in the Data Access Layer, next to the read —
 * rather than in `proxy.ts`. Next's own guidance is explicit that proxy checks
 * "should not be your only line of defense" and that layouts are the wrong place
 * because Partial Rendering means they do not re-run on navigation.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (session) return session;

  /**
   * `return` rather than a bare call: `redirect` is typed `never`, but TypeScript
   * only applies never-returning-call analysis to identifiers with an *explicit*
   * annotation, and this one arrives destructured from `createNavigation`.
   * Returning it keeps the signature honest without an `as never` cast.
   */
  return redirect({ href: '/sign-in', locale: await getLocale() });
}

/**
 * Callable from Server Actions and Route Handlers only — Next refuses cookie
 * writes during Server Component rendering ("Setting cookies is not supported
 * during Server Component rendering"), which is a large part of why sign-in is
 * an action and not a page-level side effect.
 */
export async function setSession({
  refreshToken,
  ...session
}: Session & { refreshToken: string }) {
  const store = await cookies();
  store.set(SESSION_COOKIE, JSON.stringify(session), COOKIE_OPTIONS);
  store.set(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
}

export async function getRefreshToken() {
  return (await cookies()).get(REFRESH_COOKIE)?.value ?? null;
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(REFRESH_COOKIE);
}
