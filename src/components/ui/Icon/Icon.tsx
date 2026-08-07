import cn from 'classnames';

import { Icons, IconsMap } from '~/components/ui/Icon/types';

import styles from './IconStyles.module.css';

/**
 * Renders an SVG from `src/assets/icons/` inline, as a real `<svg>` element.
 *
 * That is the whole reason the SVGR pipeline exists: an inline SVG inherits
 * `color` from its parent — so a theme token drives it — and needs no second
 * network request. An `<img src="/icons/chevron.svg">` can do neither. The
 * trade-off is bundle size, which is why this is for interface glyphs only;
 * illustrations and photographs belong in `next/image`. See docs/assets.md.
 *
 * No `'use client'`: no hooks, so it stays renderable from a Server Component.
 *
 * Deliberately *not* clickable, unlike the equivalent in react_zd_v1. A clickable
 * icon needs a focus ring, a keyboard handler and an accessible name — that is a
 * `Button`, and wrapping this in one gets all three for free.
 */
type IconProps = {
  /*
   * The type of icon to render.
   */
  type: Icons;
  /*
   * Edge length in px. Sets both `width` and `height`; the glyphs are square.
   */
  size?: number;
  /**
   * Accessible name, **already translated** — `components/ui` never calls `t()`.
   *
   * Omit it for a decorative icon sitting next to text that already says the
   * same thing (a chevron in a select trigger, a check in a menu item). The icon
   * is then `aria-hidden`, which is what you want: an announced "chevron" is
   * noise. Pass it only when the icon *is* the label.
   */
  title?: string;
  /*
   * The class name to apply to the icon.
   */
  className?: string;
  /**
   * Paints the `currentColor` channel — the strokes, the way icons in this
   * template are authored. The default keeps today's behaviour: the icon
   * inherits `color` from its parent, so a theme token still drives it and
   * dark mode stays free. Rendered as the `color` *attribute* (not an inline
   * style) on purpose: any CSS passed via `className` can still win.
   */
  strokeColor?: string;
  /**
   * Paints the interior: the root `fill`, inherited by every shape that does
   * not hard-code its own. The default matches the authored `fill="none"`.
   * A hard-coded multicolour glyph ignores both colour props — its shapes
   * carry their own values, which always beat the inherited ones.
   */
  fillColor?: string;
};

const Icon = ({
  type,
  size = 24,
  title,
  className,
  strokeColor = 'currentColor',
  fillColor = 'transparent',
}: IconProps) => {
  const Glyph = IconsMap[type];

  return (
    <Glyph
      width={size}
      height={size}
      color={strokeColor}
      fill={fillColor}
      title={title}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      /**
       * Keeps the glyph out of the tab order in IE-era SVG handling and, more
       * relevantly today, out of Firefox's focus order for `<svg>` elements.
       */
      focusable="false"
      className={cn(styles.icon, className)}
    />
  );
};

export { Icon };
export type { IconProps };
