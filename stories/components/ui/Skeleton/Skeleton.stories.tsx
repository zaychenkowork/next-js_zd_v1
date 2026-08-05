import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Skeleton } from '~/components/ui/Skeleton/Skeleton';

/**
 * The one primitive with no Base UI counterpart — Base UI 1.7 ships Progress and
 * Meter but nothing for content placeholders.
 */
const meta = {
  title: 'UI/Skeleton',
  component: Skeleton,
  args: { variant: 'text' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['text', 'rect', 'circle'] },
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Skeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** The shape a product card takes while its data is in flight. */
export const CardPlaceholder: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        width: '14rem',
      }}
    >
      <Skeleton variant="rect" height={160} />
      <Skeleton variant="text" width="70%" />
      <Skeleton variant="text" width="40%" />
    </div>
  ),
};
