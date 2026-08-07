import type { StorybookConfig } from '@storybook/nextjs-vite';
import { fileURLToPath } from 'node:url';
import svgr from 'vite-plugin-svgr';

import { ICONS_GLOB, svgrOptions } from '../svgr.config.js';

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
    options: {
      /**
       * Hands `src/assets/icons/` back to SVGR.
       *
       * This framework emulates `next/image`'s static imports with a Vite plugin
       * that claims **every** image extension — SVG included — in `resolveId`,
       * redirecting it to a virtual module that exports
       * `{ src, width, height, blurDataURL }`. It wins over `vite-plugin-svgr`
       * no matter which order the plugins are in, because it intercepts one hook
       * earlier. The upstream plugin only steps aside for the `?react` query,
       * which this repo does not use — see svgr.config.js for why.
       *
       * Without this exclusion the Storybook build *succeeds* and every Icon
       * story renders a broken element, because a story is only evaluated when
       * it is opened. That is the failure this line prevents.
       *
       * The key is `excludeFiles`, not `exclude` — the option is named
       * `exclude` in that plugin's README and `excludeFiles` in its types and
       * its implementation (v3.3.2). The README spelling is silently ignored,
       * which costs an afternoon to notice.
       */
      image: { excludeFiles: [ICONS_GLOB] },
    },
  },

  core: {
    // A template should not send anonymous usage data from someone else's
    // machine without them opting in.
    disableTelemetry: true,
  },

  async viteFinal(viteConfig) {
    /**
     * The third and last place the SVGR transform has to be registered.
     * Storybook builds its own Vite pipeline and inherits neither
     * `next.config.ts` nor `vitest.config.ts`, so without this an Icon story
     * renders a broken element while the same component is fine in the app —
     * the most confusing of the three failure modes. Options come from
     * `svgr.config.js` so all three agree. See docs/assets.md.
     */
    viteConfig.plugins = [
      svgr({ svgrOptions, include: ICONS_GLOB }),
      ...(viteConfig.plugins ?? []),
    ];

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
