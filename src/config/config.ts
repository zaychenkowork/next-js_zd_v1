import { APP_VERSION, CLIENT_ENV } from '~/config/env';

/**
 * App-level values that every layer may read: branding, contact details,
 * feature flags. The split against its neighbours:
 *
 * - `~/config/env` — what the *deployment* supplies. Raw, validated, unopinionated.
 * - `~/config/config` — what the *app* is. Same for every deployment, or derived
 *   from `CLIENT_ENV` into something the app actually asks about.
 * - `~/constants/*` — domain values scoped to one feature (page sizes, filter keys).
 *   They do not belong here; this object is for things with app-wide reach.
 *
 * Two rules:
 *
 * 1. **Never `getServerEnv()` here.** This module is imported by Client
 *    Components, so a server key read at module scope would throw in the
 *    browser. Server configuration has no business being in a shared object —
 *    read it in the DAL or the action that needs it.
 * 2. **Do not re-export `CLIENT_ENV` values verbatim.** `CONFIG.API_URL` next to
 *    `CLIENT_ENV.NEXT_PUBLIC_API_URL` is two names for one value and the two
 *    call sites will drift. Only put a variable here when the wrapping adds
 *    meaning, as `ENABLE_DEVTOOLS` does.
 *
 * When navigation or route helpers arrive they get their own `~/config/routes.ts`
 * rather than growing this object.
 */
export const CONFIG = {
  APP_NAME: 'next-zd-v1',
  APP_VERSION,
  SUPPORT_EMAIL: 'support@example.com',

  /*
   * Renders the TanStack Query devtools panel. Off unless a deployment opts in.
   */
  ENABLE_DEVTOOLS: CLIENT_ENV.NEXT_PUBLIC_ENABLE_DEVTOOLS,
} as const;
