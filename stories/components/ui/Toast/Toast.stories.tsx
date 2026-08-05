import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Button } from '~/components/ui/Button/Button';
import { showToast } from '~/components/ui/Toast/showToast';

/**
 * The toast seam, visible: `showToast` is called from plain JavaScript with an
 * i18n **key**, and `ToastList` (mounted by the preview decorator) translates it.
 * Switch the locale in the toolbar and press the buttons again — same call, three
 * languages.
 */
const meta = {
  title: 'UI/Toast',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Types: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      <Button
        onClick={() => showToast({ titleKey: 'cart.added', type: 'success' })}
      >
        Success
      </Button>

      <Button
        variant="danger"
        onClick={() =>
          showToast({
            titleKey: 'errors.unexpectedTitle',
            descriptionKey: 'errors.unexpectedBody',
            type: 'error',
          })
        }
      >
        Error
      </Button>

      <Button
        variant="secondary"
        onClick={() =>
          showToast({
            titleKey: 'products.inStock',
            type: 'info',
            values: { count: 7 },
          })
        }
      >
        With values
      </Button>
    </div>
  ),
};
