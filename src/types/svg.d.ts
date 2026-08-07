/**
 * Types the icon imports that SVGR turns into components.
 *
 * `next/image-types/global` (pulled in by `next-env.d.ts`) already declares
 * `*.svg`, but as `any` — deliberately, so that it does not conflict with an
 * SVGR setup it cannot know about. That leaves every icon untyped: a typo in a
 * prop, or passing an icon where a component is not expected, compiles fine.
 *
 * This declaration is *more specific* than `*.svg` — TypeScript picks the
 * ambient module whose wildcard matches the longest prefix — so it wins for
 * exactly the paths the Turbopack rule transforms, and nothing else. Icons under
 * `src/assets/icons/` are components; every other `.svg` in the repo keeps the
 * `any` from Next, because that one really is a URL string at runtime and typing
 * it as a component would be a lie in the other direction.
 *
 * This is also why icons must be imported through the `~` alias rather than a
 * relative path: `../../assets/icons/chevron.svg` does not match this pattern
 * and silently falls back to `any`.
 *
 * The `react` import sits *inside* the block on purpose. A top-level `import`
 * would turn this file into a module, and `declare module` in a module is a
 * module *augmentation* — which requires the module to already exist and fails
 * on a wildcard. Keeping the file a global script is what makes the declaration
 * ambient.
 *
 * See docs/assets.md.
 */
declare module '~/assets/icons/*.svg' {
  import type { FC, SVGProps } from 'react';

  const Component: FC<SVGProps<SVGSVGElement> & { title?: string }>;
  export default Component;
}
