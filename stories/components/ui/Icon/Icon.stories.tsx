import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Icon } from '~/components/ui/Icon/Icon';
import { Icons } from '~/components/ui/Icon/types';

/**
 * Every SVG in `src/assets/icons/` reaches the app through this component. The
 * stories double as the icon catalogue — the reason `AllIcons` exists is so
 * "does this app already have a check mark?" is a Storybook search rather than
 * an `ls`.
 */
const meta = {
  title: 'UI/Icon',
  component: Icon,
  args: { type: Icons.Search, size: 24 },
  argTypes: {
    type: {
      control: 'select',
      options: Object.values(Icons).filter(
        (value) => typeof value === 'number',
      ),
      /** A numeric enum has no runtime names, so the labels are spelled out. */
      mapping: Icons,
      labels: {
        [Icons.Check]: 'Check',
        [Icons.Chevron]: 'Chevron',
        [Icons.Search]: 'Search',
      },
    },
    size: { control: { type: 'range', min: 12, max: 64, step: 2 } },
    strokeColor: { control: 'color' },
    fillColor: { control: 'color' },
  },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/**
 * The default behaviour: no colour props, the icon takes whatever `color` its
 * container has — including a theme token, which is what makes dark mode free.
 * Reach for `strokeColor`/`fillColor` only when the icon must differ from the
 * text next to it.
 */
export const InheritsColor: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
      <span style={{ color: 'var(--color-text)' }}>
        <Icon type={Icons.Check} />
      </span>
      <span style={{ color: 'var(--color-accent)' }}>
        <Icon type={Icons.Check} />
      </span>
      <span style={{ color: 'var(--color-danger)' }}>
        <Icon type={Icons.Check} />
      </span>
    </div>
  ),
};

/**
 * Explicit colours: `strokeColor` drives the `currentColor` channel (the
 * strokes, the way these glyphs are authored), `fillColor` paints the
 * interior that the authored `fill="none"` leaves empty.
 */
export const CustomColors: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
      <Icon type={Icons.Search} size={32} strokeColor="var(--color-accent)" />
      <Icon
        type={Icons.Search}
        size={32}
        strokeColor="var(--color-danger)"
        fillColor="var(--color-bg-subtle)"
      />
      <Icon type={Icons.Check} size={32} strokeColor="var(--color-success)" />
    </div>
  ),
};

/** The full set. Add an icon and it shows up here without touching this file. */
export const AllIcons: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: 'flex', gap: '2rem', color: 'var(--color-text)' }}>
      {(
        Object.values(Icons).filter((v) => typeof v === 'number') as Icons[]
      ).map((type) => (
        <Icon key={type} type={type} size={32} />
      ))}
    </div>
  ),
};
