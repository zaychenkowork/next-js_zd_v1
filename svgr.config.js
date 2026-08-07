/**
 * One SVGR configuration, consumed by all three bundlers this repo runs.
 *
 *   next.config.ts      → Turbopack, via `@svgr/webpack` in `turbopack.rules`
 *   vitest.config.ts    → Vite, via `vite-plugin-svgr`
 *   .storybook/main.ts  → Vite again, via the same plugin in `viteFinal`
 *
 * They have to agree: an icon that renders as a component in `next dev` but as a
 * URL string under Vitest fails only in the test run, with an error that points
 * at the component rather than at the config. Keeping the options in one file
 * makes the drift impossible instead of merely unlikely. See docs/assets.md.
 *
 * `@svgr/webpack` and `vite-plugin-svgr`'s `svgrOptions` both take the plain
 * `@svgr/core` option object, so this is passed through unchanged in both cases.
 *
 * Plain `.js` rather than `.ts`: `next.config.ts` is compiled by Next, but the
 * Turbopack rules inside it are handed to a Rust bundler, and keeping this file
 * transpile-free removes one thing that can go wrong at config-load time.
 */

/**
 * Only files under this directory become React components. Everything else with
 * a `.svg` extension keeps Next's default behaviour — a static import that
 * resolves to a URL, which is what `next/image`, `<img>` and CSS `url()` need.
 *
 * Turbopack matches `condition.path` against the project-relative path with
 * forward slashes on every platform, and `@rollup/pluginutils` (which backs the
 * Vite plugin's `include`) normalizes the same way, so one pattern covers both.
 */
export const ICONS_DIR = 'src/assets/icons';

/** RegExp form, for Turbopack's `condition.path`. */
export const ICONS_PATH_PATTERN = /src\/assets\/icons\//;

/** Glob form, for `vite-plugin-svgr`'s `include`. */
export const ICONS_GLOB = '**/src/assets/icons/**/*.svg';

/**
 * The annotation is not decoration. Without a contextual type, TypeScript widens
 * `'default'` to `string` and `'preset-default'` to `string`, and neither then
 * matches SVGR's option unions — which surfaces as an error in the two configs
 * that consume this file rather than here. `@svgr/core` is a devDependency for
 * this type alone; it is already installed as a dependency of `@svgr/webpack`.
 *
 * @type {import('@svgr/core').Config}
 */
export const svgrOptions = {
  /**
   * `default`, so an icon is imported as `import Chevron from '...svg'` with no
   * `?react` suffix. The suffix form is what most `vite-plugin-svgr` examples
   * show, and it is exactly what breaks under Vitest — a query-suffixed import
   * falls back to Vite's asset handling and resolves to a data-URI string, not a
   * component. One import spelling that works in all three bundlers is worth
   * more than matching the upstream README.
   */
  exportType: 'default',
  /** Lets `Icon` forward a ref to the underlying `<svg>`. */
  ref: true,
  /**
   * Adds a `title` prop that SVGR renders as a `<title>` element — the
   * accessible name of an `<svg role="img">`. Without it an icon can only ever
   * be decorative.
   */
  titleProp: true,
  /**
   * Figma exports icons with a hard-coded near-black fill. Rewriting it to
   * `currentColor` at build time is what lets `color` on the parent — including
   * a theme token — drive the icon, without editing exported files by hand. An
   * icon authored with `currentColor` already (as every icon here is)
   * is unaffected.
   */
  // replaceAttrValues: { '#0B0B0C': 'currentColor' },
  svgoConfig: {
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            /**
             * SVGO drops `viewBox` when `width`/`height` are present. `Icon`
             * sets both from its `size` prop, so without the viewBox the glyph
             * would be cropped instead of scaled at every size but the
             * authored one.
             */
            removeViewBox: false,
          },
        },
      },
    ],
  },
};
