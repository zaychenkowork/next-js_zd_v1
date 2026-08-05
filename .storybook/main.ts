import type { StorybookConfig } from '@storybook/nextjs-vite';
import { fileURLToPath } from 'node:url';

/**
 * `@storybook/nextjs-vite`, not `@storybook/react-vite`. The Next-specific
 * framework is what supplies working stand-ins for `next/image`,
 * `next/navigation`, `next/font` and `next/link` — without it a story for any
 * component that renders an `<Image>` fails on import, which in this app is most
 * of the feature layer.
 *
 * The Webpack-based `@storybook/nextjs` still exists; the Vite variant is the one
 * Storybook 10 documents for new projects and it shares Vite with the Vitest
 * setup, so there is one bundler to reason about instead of two.
 */
const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(ts|tsx)'],
  addons: [],
  framework: {
    name: '@storybook/nextjs-vite',
    options: {},
  },

  core: {
    // A template should not send anonymous usage data from someone else's
    // machine without them opting in.
    disableTelemetry: true,
  },

  async viteFinal(viteConfig) {
    /**
     * Vite's native `resolve.tsconfigPaths` does not apply to importers inside
     * this dot-directory, so the `~` alias has to be declared explicitly for
     * `.storybook/preview.tsx` to resolve it. Same workaround as the plain-React
     * template — see docs/storybook.md.
     */
    viteConfig.resolve = {
      ...viteConfig.resolve,
      alias: {
        ...viteConfig.resolve?.alias,
        '~': fileURLToPath(new URL('../src', import.meta.url)),
      },
    };

    return viteConfig;
  },
};

export default config;
