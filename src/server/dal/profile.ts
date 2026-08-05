import 'server-only';

import { cache } from 'react';

import { getAuthHeaders, getSession, requireSession } from '~/server/session';

import { api } from '~/api/api';
import { isUnauthorizedError } from '~/api/errors';

/**
 * Per-user reads. Two entry points on purpose, because "must be signed in" and
 * "might be signed in" are different questions and conflating them is how a
 * header ends up redirecting anonymous visitors to the sign-in page.
 *
 * Neither is cached across requests, and cannot be even by mistake: the
 * `authorization` header makes Next skip the Data Cache for the request. The
 * `cache()` wrapper is per-render memoisation only.
 */
export const getProfile = cache(async () => {
  await requireSession();
  return api.profileGet({ headers: await getAuthHeaders() });
});

/**
 * For the header and anywhere else that renders differently when signed in.
 * Returns `null` instead of redirecting, and treats a rejected token as "not
 * signed in" — an expired session should not break an otherwise public page.
 */
export const getOptionalProfile = cache(async () => {
  const session = await getSession();
  if (!session) return null;

  try {
    return await api.profileGet({ headers: await getAuthHeaders() });
  } catch (error) {
    if (isUnauthorizedError(error)) return null;
    throw error;
  }
});
