import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ProductCard } from '~/features/catalog/ProductCard/ProductCard';

import { Button } from '~/components/ui/Button/Button';

/**
 * A feature component, rendering for real: `next/image`, `next/link` and
 * next-intl's `useFormatter` all work because `@storybook/nextjs-vite` supplies
 * the Next runtime.
 *
 * The action slot takes a plain `Button` rather than the real `AddToCartButton` —
 * that one calls a Server Action, which has no meaning outside a Next server.
 * Passing the action in as `children` instead of an `onAddToCart` callback is what
 * makes both substitutions possible; see the note in ProductCard.tsx.
 *
 * Switch the toolbar to `uk` or `ar` and the price reformats — separators, symbol
 * placement and direction all follow the locale.
 */
const product = {
  id: 1,
  title: 'Essence Mascara Lash Princess',
  description: 'A volumising mascara.',
  category: 'beauty',
  price: 9.99,
  rating: 4.5,
  stock: 34,
  thumbnail: 'https://cdn.dummyjson.com/product-images/1/thumbnail.webp',
};

const meta = {
  title: 'Catalog/ProductCard',
  component: ProductCard,
  args: { product },
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div style={{ width: '16rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProductCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAction: Story = {
  args: {
    children: (
      <Button size="s" fullWidth>
        Add to cart
      </Button>
    ),
  },
};

export const OutOfStock: Story = {
  args: {
    product: { ...product, stock: 0 },
    children: (
      <Button size="s" fullWidth disabled>
        Add to cart
      </Button>
    ),
  },
};

export const LongTitle: Story = {
  args: {
    product: {
      ...product,
      title:
        'Essence Mascara Lash Princess Waterproof Volumising Long-Lasting Edition',
    },
  },
};
