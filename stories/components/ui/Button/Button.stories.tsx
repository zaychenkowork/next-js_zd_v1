import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Button } from '~/components/ui/Button/Button';

/**
 * `stories/` mirrors `src/` 1:1, the same way `__tests__/` does. Finding the story
 * for a component is a path substitution rather than a search, and a component
 * without a story is visible as a missing file.
 */
const meta = {
  title: 'UI/Button',
  component: Button,
  args: {
    children: 'Add to cart',
    variant: 'primary',
    size: 'm',
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    size: { control: 'inline-radio', options: ['s', 'm', 'l'] },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** All four variants side by side — the fastest way to spot a broken token. */
export const Variants: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <Button size="s">Small</Button>
      <Button size="m">Medium</Button>
      <Button size="l">Large</Button>
    </div>
  ),
};

/**
 * The label stays in the accessibility tree while the spinner shows, so the button
 * never becomes an unnamed control mid-request. Inspect it with the a11y panel.
 */
export const Loading: Story = {
  args: { loading: true, children: 'Saving' },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const FullWidth: Story = {
  args: { fullWidth: true },
  parameters: { layout: 'padded' },
};
