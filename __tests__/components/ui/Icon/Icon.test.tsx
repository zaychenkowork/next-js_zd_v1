import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Icon } from '~/components/ui/Icon/Icon';
import { Icons } from '~/components/ui/Icon/types';

describe('Icon', () => {
  /**
   * The one test that is really about the build, not the component. If the SVGR
   * transform is missing from `vitest.config.ts`, the icon import resolves to a
   * URL string and React renders it as text — so `<svg>` with a `<path>` inside
   * is the assertion that the whole pipeline in svgr.config.js is wired up.
   */
  it('inlines the SVG instead of rendering a URL', () => {
    const { container } = render(<Icon type={Icons.Search} />);
    const svg = container.querySelector('svg');

    expect(svg).toBeInTheDocument();
    expect(svg?.querySelector('path')).toBeInTheDocument();
  });

  it('exposes a titled icon as an image with that accessible name', () => {
    render(<Icon type={Icons.Search} title="Search products" />);

    expect(
      screen.getByRole('img', { name: 'Search products' }),
    ).toBeInTheDocument();
  });

  it('hides an untitled icon from assistive technology', () => {
    const { container } = render(<Icon type={Icons.Chevron} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('sizes both axes from the size prop', () => {
    const { container } = render(<Icon type={Icons.Check} size={16} />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
  });

  /**
   * The colour contract: `strokeColor` rides the `currentColor` channel (the
   * `color` attribute), `fillColor` is the root `fill` that unpainted shapes
   * inherit. Attributes, not inline styles — so CSS from `className` can
   * still override them. The defaults reproduce an untinted icon: inherit
   * the parent's `color`, keep the interior transparent.
   */
  it('defaults to inheriting color with a transparent interior', () => {
    const { container } = render(<Icon type={Icons.Search} />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('color', 'currentColor');
    expect(svg).toHaveAttribute('fill', 'transparent');
  });

  it('paints stroke and fill from the colour props', () => {
    const { container } = render(
      <Icon type={Icons.Search} strokeColor="tomato" fillColor="gold" />,
    );
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('color', 'tomato');
    expect(svg).toHaveAttribute('fill', 'gold');
  });

  /**
   * Without a viewBox, `size` crops the glyph instead of scaling it — and it
   * still looks correct at the authored 24px, so it is worth asserting.
   *
   * Note this covers the *source* SVG, not `removeViewBox: false` in
   * svgr.config.js: `vite-plugin-svgr` runs only SVGR's JSX plugin, never SVGO,
   * so nothing here could strip it. That option matters for the Turbopack build,
   * where SVGO does run — see docs/assets.md for how to check that side.
   */
  it('keeps the viewBox so a resized glyph scales rather than crops', () => {
    const { container } = render(<Icon type={Icons.Chevron} size={48} />);

    expect(container.querySelector('svg')).toHaveAttribute(
      'viewBox',
      '0 0 24 24',
    );
  });
});
