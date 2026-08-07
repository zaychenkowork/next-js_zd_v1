import type { FC, SVGProps } from 'react';

import Check from '~/assets/icons/check.svg';
import Chevron from '~/assets/icons/chevron.svg';
import Search from '~/assets/icons/search.svg';

/**
 * What SVGR produces for a file in `src/assets/icons/` — see
 * `src/types/svg.d.ts` for why the import is typed at all, and `svgr.config.js`
 * for where `title` comes from.
 */
type SVGComponent = FC<SVGProps<SVGSVGElement> & { title?: string }>;

/**
 * The registry. Adding an icon is two lines here plus the `.svg` file, and
 * nothing else: `Icon` is the only component that ever imports from
 * `~/assets/icons/`, so an icon set stays one map instead of a hundred imports
 * scattered across features.
 *
 * A numeric enum rather than a string union, matching react_zd_v1 — call sites
 * read `Icons.Chevron`, so a renamed file never leaks into JSX.
 */
export enum Icons {
  Check,
  Chevron,
  Search,
}

/**
 * `Record<Icons, …>` and not `Partial<…>`: adding a member to the enum without
 * registering its component is a type error, which is the only reliable moment
 * to catch it.
 */
export const IconsMap: Record<Icons, SVGComponent> = {
  [Icons.Check]: Check,
  [Icons.Chevron]: Chevron,
  [Icons.Search]: Search,
};
