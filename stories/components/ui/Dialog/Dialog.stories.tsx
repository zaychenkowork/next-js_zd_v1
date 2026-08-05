import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Button } from '~/components/ui/Button/Button';
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/Dialog/Dialog';

/**
 * Worth opening in the `ar` locale from the toolbar: the popup, its footer and the
 * close button all flip without a single `[dir]` selector, because the styles use
 * logical properties only.
 */
const meta = {
  title: 'UI/Dialog',
  component: DialogRoot,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof DialogRoot>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <DialogRoot>
      <DialogTrigger render={<Button>Delete account</Button>} />
      <DialogContent>
        <DialogTitle>Delete account?</DialogTitle>
        <DialogDescription>
          This removes every order and cannot be undone.
        </DialogDescription>
        <DialogFooter>
          <DialogClose render={<Button variant="secondary">Cancel</Button>} />
          <DialogClose render={<Button variant="danger">Delete</Button>} />
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  ),
};

/** Long content scrolls inside the viewport, not off the top of the screen. */
export const Scrollable: Story = {
  render: () => (
    <DialogRoot>
      <DialogTrigger render={<Button>Open terms</Button>} />
      <DialogContent>
        <DialogTitle>Terms</DialogTitle>
        {Array.from({ length: 25 }, (_, index) => (
          <p key={index}>Clause {index + 1}. Something about shipping.</p>
        ))}
        <DialogFooter>
          <DialogClose render={<Button>Close</Button>} />
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  ),
};
