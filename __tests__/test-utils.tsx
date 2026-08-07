import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from 'next-themes';
import { DirectionProvider } from '@base-ui/react/direction-provider';
import { Toast } from '@base-ui/react/toast';
import { Tooltip } from '@base-ui/react/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { RenderOptions } from '@testing-library/react';
import { render } from '@testing-library/react';

import { toastManager } from '~/components/ui/Toast/toastManager';

import { DEFAULT_LOCALE } from '~/constants/locales';
import { STORAGE_KEYS } from '~/constants/storageKeys';

import messages from '../src/i18n/messages/uk.json';

/**
 * The provider stack under test mirrors src/app/providers.tsx, minus the devtools.
 *
 * `retry: false` matters more than it looks: with the app's default of two
 * retries, a test asserting an error state waits for three failed attempts and
 * usually times out instead of failing with a useful message.
 *
 * Messages come from the real `src/i18n/messages/uk.json` rather than a fixture,
 * so a test fails when a key is renamed in one locale and not the others — which
 * is the failure mode a mocked `t()` hides.
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="light"
      enableSystem={false}
      storageKey={STORAGE_KEYS.theme}
      scriptProps={{ type: 'text/plain' }}
    >
      <NextIntlClientProvider locale={DEFAULT_LOCALE} messages={messages}>
        <QueryClientProvider client={createTestQueryClient()}>
          <DirectionProvider direction="ltr">
            {/* `delay: 0` so hover tests do not have to wait out the app's 300ms
                open delay. */}
            <Tooltip.Provider delay={0}>
              <Toast.Provider toastManager={toastManager}>
                {children}
              </Toast.Provider>
            </Tooltip.Provider>
          </DirectionProvider>
        </QueryClientProvider>
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: AllProviders, ...options });
}
