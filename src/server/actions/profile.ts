'use server';

import { refresh } from 'next/cache';

import { authAction } from '~/server/actions/client';

import { api } from '~/api/api';

import { updateProfileSchema } from '~/schemas/user';

/**
 * Built on `authAction`, so the session check has already run before this handler
 * is entered — there is no way to ship this action without it.
 *
 * `refresh()` is the right tool here and `updateTag` is not: the profile read
 * carries an `authorization` header, which makes Next skip the Data Cache
 * entirely. There is no cache entry to expire. What needs to happen is a
 * re-render of the dynamic parts of the route, which is exactly what `refresh()`
 * does — it updates the client's RSC payload without a full page load and
 * without touching any cache.
 *
 * Strictly speaking the call is redundant: a Server Action already returns a
 * re-rendered payload. It is here because being explicit about *which* of the
 * three invalidation tools applies to uncached data is worth more in a template
 * than saving a line. Delete it if you prefer implicit.
 */
export const updateProfileAction = authAction
  .metadata({ actionName: 'updateProfile' })
  .inputSchema(updateProfileSchema)
  .action(async ({ parsedInput, ctx }) => {
    const profile = await api.profilePut(ctx.session.userId, parsedInput, {
      headers: { authorization: `Bearer ${ctx.session.accessToken}` },
    });

    refresh();

    return profile;
  });
