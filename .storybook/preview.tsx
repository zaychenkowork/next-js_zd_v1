import { useEffect } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider, useTheme } from 'next-themes';
import { DirectionProvider } from '@base-ui/react/direction-provider';
import { Toast } from '@base-ui/react/toast';
import { Tooltip } from '@base-ui/react/tooltip';
import type { Decorator, Preview } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ToastList } from '~/components/ui/Toast/ToastList';
import { toastManager } from '~/components/ui/Toast/toastManager';

import {
  type Locale,
  LOCALE_DIRECTIONS,
  LOCALE_NAMES,
} from '~/constants/locales';
import { STORAGE_KEYS } from '~/constants/storageKeys';
import { type Theme, THEMES } from '~/constants/theme';

import arMessages from '../messages/ar.json';
import enMessages from '../messages/en.json';
import ukMessages from '../messages/uk.json';

import '~/styles/globals.css';
import toastStyles from '~/components/ui/Toast/ToastStyles.module.css';

const MESSAGES = {
  uk: ukMessages,
  en: enMessages,
  ar: arMessages,
} as const;

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

/**
 * Locale and theme are Storybook **globals**, so every story gets a toolbar
 * switch for both. Switching locale also flips `dir`, which makes the RTL check
 * a two-click job rather than something you only discover in production — the
 * single most valuable thing this Storybook setup does for an app that ships
 * Arabic.
 */
type AppProvidersProps = {
  children: React.ReactNode;
  locale: Locale;
  theme: Theme;
};

/**
 * A real component, not the decorator itself. A `Decorator` is a plain function
 * as far as React is concerned, so calling `useEffect` inside one breaks the rules
 * of hooks — and the linter is right to say so.
 */
function AppProviders({ children, locale, theme }: AppProvidersProps) {
  const direction = LOCALE_DIRECTIONS[locale];
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme(theme);
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
  }, [theme, locale, direction, setTheme]);

  return (
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
      <QueryClientProvider client={queryClient}>
        <DirectionProvider direction={direction}>
          <Tooltip.Provider delay={200}>
            <Toast.Provider toastManager={toastManager}>
              {/* Mirrors src/styles/base.css: Base UI needs an isolated stacking
                  context for its portals, and stories portal too. */}
              <div id="app-root" style={{ isolation: 'isolate' }}>
                {children}
              </div>

              <Toast.Portal>
                <Toast.Viewport className={toastStyles.viewport}>
                  <ToastList />
                </Toast.Viewport>
              </Toast.Portal>
            </Toast.Provider>
          </Tooltip.Provider>
        </DirectionProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>
  );
}

const withAppProviders: Decorator = (Story, context) => {
  const theme = context.globals.theme as Theme;

  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme={theme}
      enableSystem={false}
      storageKey={STORAGE_KEYS.theme}
      scriptProps={{ type: 'text/plain' }}
    >
      <AppProviders locale={context.globals.locale as Locale} theme={theme}>
        <Story />
      </AppProviders>
    </ThemeProvider>
  );
};

const preview: Preview = {
  initialGlobals: {
    locale: 'en',
    theme: 'light',
  },

  globalTypes: {
    locale: {
      description: 'Active locale',
      toolbar: {
        icon: 'globe',
        items: Object.entries(LOCALE_NAMES).map(([value, title]) => ({
          value,
          title,
        })),
        dynamicTitle: true,
      },
    },
    theme: {
      description: 'Colour theme',
      toolbar: {
        icon: 'paintbrush',
        items: THEMES.map((value) => ({ value, title: value })),
        dynamicTitle: true,
      },
    },
  },

  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'centered',
  },

  decorators: [withAppProviders],
};

export default preview;
