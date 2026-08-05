import {
  type DefaultOptions,
  defaultShouldDehydrateQuery,
} from '@tanstack/react-query';

/**
 * Defaults shared by every QueryClient instance in the app (browser, SSR pass,
 * and the throwaway server-side prefetch client) — see src/api/queryClient.ts
 * for why there are three.
 */
export const QUERY_DEFAULT_OPTIONS: DefaultOptions = {
  queries: {
    /**
     * Above 0 on purpose. With SSR, a `staleTime` of 0 makes every hydrated
     * query refetch immediately on mount, throwing away the data the server
     * just streamed down.
     */
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  },
  mutations: {
    retry: 0,
  },
  dehydrate: {
    /**
     * By default only *settled* queries are dehydrated. Including `pending`
     * ones (React Query 5.40+) lets a Server Component kick off a prefetch
     * without `await`ing it and stream the result to the client instead.
     */
    shouldDehydrateQuery: (query) =>
      defaultShouldDehydrateQuery(query) || query.state.status === 'pending',

    /**
     * Errors must NOT be redacted here. Next.js detects dynamic pages by
     * observing thrown errors during render; swallowing them breaks that
     * detection. This is TanStack's own recommendation for Next.js — do not
     * "fix" it back to the default.
     */
    shouldRedactErrors: () => false,
  },
};
