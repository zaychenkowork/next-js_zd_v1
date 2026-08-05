import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { TextField } from '~/components/ui/TextField/TextField';

const meta = {
  title: 'UI/TextField',
  component: TextField,
  args: {
    label: 'Email',
    name: 'email',
    placeholder: 'you@example.com',
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof TextField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const WithDescription: Story = {
  args: { description: 'We only use this for order updates.' },
};

/**
 * `error` is an already-translated string — `components/ui` knows nothing about
 * i18n, which is exactly what lets this story render without a locale provider.
 */
export const WithError: Story = {
  args: { error: 'Enter a valid email address' },
};

export const Disabled: Story = {
  args: { disabled: true, value: 'locked@example.com' },
};
