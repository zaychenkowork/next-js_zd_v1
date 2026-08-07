import type { QueryKey } from '@tanstack/react-query';

/**
 * Typed `meta` for queries and mutations. This is the officially supported
 * extension point (`interface Register`) and it is what lets the global caches
 * in src/api/browserQueryClient.ts stay generic while call sites stay
 * declarative.
 *
 * `interface` rather than `type` here because declaration merging is the whole
 * point — see docs/conventions.md.
 */
declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: {
      /** Show the generic error toast when this query fails. */
      errorToast?: boolean;
    };
    mutationMeta: {
      /** Show the generic error toast when this mutation fails. */
      errorToast?: boolean;
      /** i18n key of the success message, e.g. `'cart.added'`. */
      successToast?: string;
      /** Client-side cache keys to invalidate on success. */
      invalidates?: QueryKey[];
      /**
       * Server Action that revalidates the *server* cache after a successful
       * mutation — typically one of the helpers in `src/server/cache/revalidate.ts`.
       * Invalidating the TanStack cache does nothing to server-rendered
       * output, so mutations that change RSC-rendered data need this too.
       */
      revalidate?: () => Promise<unknown>;
    };
  }
}
