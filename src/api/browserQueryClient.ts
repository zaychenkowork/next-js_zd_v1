'use client';

import {
  environmentManager,
  MutationCache,
  QueryCache,
  QueryClient,
} from '@tanstack/react-query';

import { showToast } from '~/components/ui/Toast/showToast';

import { reportError } from '~/api/reportError';

import { QUERY_DEFAULT_OPTIONS } from '~/config/query';

/**
 * The client-side QueryClient, with the app's single notification and
 * invalidation funnel attached.
 *
 * Global cache callbacks rather than per-call `onError`: a per-observer callback
 * fires once per hook instance, so two components sharing one query would show
 * two toasts for one failure. The global cache fires once per query — which is
 * why v5 removed `onError` from `useQuery` in the first place.
 *
 * What is declarative (`meta`) vs. what is written at the call site:
 *   - errors and invalidation → declared in `meta`, handled here, impossible to
 *     forget;
 *   - success messages → `meta.successToast` for the common case, but a call
 *     site is free to do its own thing in `onSuccess`.
 */
function makeBrowserQueryClient() {
  return new QueryClient({
    defaultOptions: QUERY_DEFAULT_OPTIONS,

    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.meta?.errorToast) reportError(error);
      },
    }),

    mutationCache: new MutationCache({
      onError: (error, _variables, _onMutateResult, mutation) => {
        if (mutation.meta?.errorToast) reportError(error);
      },

      onSuccess: async (
        _data,
        _variables,
        _onMutateResult,
        mutation,
        context,
      ) => {
        const { meta } = mutation;

        if (meta?.successToast) {
          showToast({ titleKey: meta.successToast, type: 'success' });
        }

        meta?.invalidates?.forEach((queryKey) => {
          context.client.invalidateQueries({ queryKey });
        });

        /**
         * Invalidating the TanStack cache does nothing to server-rendered
         * output — the two caches are unrelated systems. A mutation that
         * changes data rendered by a Server Component declares a Server Action
         * here (a thin wrapper over src/server/cache/revalidate.ts — see
         * docs/mutations.md), which invalidates the server
         * cache and ships a re-rendered RSC payload in the same response.
         */
        if (meta?.revalidate) {
          try {
            await meta.revalidate();
          } catch (error) {
            // The mutation itself succeeded; a failed revalidation is worth
            // recording but must not surface as a failed action to the user.
            reportError(error, { toast: false });
          }
        }
      },
    }),
  });
}

let browserQueryClient: QueryClient | undefined;

export function getBrowserQueryClient() {
  /**
   * This file is a Client Component module, which still executes on the server
   * during SSR. There it must hand back a fresh client every time: a
   * module-level singleton in a long-lived Node process would be shared across
   * requests from different users.
   */
  if (environmentManager.isServer()) {
    return makeBrowserQueryClient();
  }

  browserQueryClient ??= makeBrowserQueryClient();
  return browserQueryClient;
}
