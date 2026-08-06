'use client';

import { ThemeProvider } from 'next-themes';
import { DirectionProvider } from '@base-ui/react/direction-provider';
import { Toast } from '@base-ui/react/toast';
import { Tooltip } from '@base-ui/react/tooltip';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { ToastList } from '~/components/ui/Toast/ToastList';
import { toastManager } from '~/components/ui/Toast/toastManager';

import { getBrowserQueryClient } from '~/api/browserQueryClient';

import { CLIENT_ENV } from '~/config/env';

import { STORAGE_KEYS } from '~/constants/storageKeys';

import toastStyles from '~/components/ui/Toast/ToastStyles.module.css';

type ProvidersProps = {
  children: React.ReactNode;
  /**
   * Base UI's `DirectionProvider` does not read `dir` from the DOM, so the
   * direction resolved from the locale in the layout has to be handed to it
   * explicitly. Without this, popups and menus keep LTR placement in the `ar`
   * locale.
   */
  direction: 'ltr' | 'rtl';
};

export function Providers({ children, direction }: ProvidersProps) {
  /**
   * Not `useState(() => ...)`: the current TanStack guidance is explicit that
   * initialising the client in state is unsafe here, because React discards it
   * on the initial render if something suspends and there is no Suspense
   * boundary in between. The module-level singleton with a server-side branch
   * lives in browserQueryClient.ts.
   */
  const queryClient = getBrowserQueryClient();

  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      storageKey={STORAGE_KEYS.theme}
      scriptProps={{
        type: typeof window === 'undefined' ? 'text/javascript' : 'text/plain',
      }}
    >
      <QueryClientProvider client={queryClient}>
        <DirectionProvider direction={direction}>
          {/* One provider for the whole app: it shares the hover delay between
              tooltips, so moving along a row of icon buttons does not replay the
              open delay on each one. */}
          <Tooltip.Provider delay={300}>
            <Toast.Provider toastManager={toastManager}>
              {/* #app-root carries `isolation: isolate`, which Base UI requires
                  for predictable portal stacking. */}
              <div id="app-root">{children}</div>

              <Toast.Portal>
                <Toast.Viewport className={toastStyles.viewport}>
                  <ToastList />
                </Toast.Viewport>
              </Toast.Portal>
            </Toast.Provider>
          </Tooltip.Provider>
        </DirectionProvider>

        {CLIENT_ENV.NEXT_PUBLIC_ENABLE_DEVTOOLS ? (
          <ReactQueryDevtools initialIsOpen={false} />
        ) : null}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
