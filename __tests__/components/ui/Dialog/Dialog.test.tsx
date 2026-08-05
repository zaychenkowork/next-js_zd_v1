import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

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

import { renderWithProviders } from '../../../test-utils';

function Example() {
  return (
    <DialogRoot>
      <DialogTrigger render={<Button>Open</Button>} />
      <DialogContent>
        <DialogTitle>Confirm</DialogTitle>
        <DialogDescription>This cannot be undone.</DialogDescription>
        <DialogFooter>
          <DialogClose render={<Button variant="secondary">Cancel</Button>} />
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}

describe('Dialog', () => {
  it('is closed until the trigger is activated', () => {
    renderWithProviders(<Example />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens on the trigger and exposes the title as its accessible name', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Example />);

    await user.click(screen.getByRole('button', { name: 'Open' }));

    expect(
      await screen.findByRole('dialog', { name: 'Confirm' }),
    ).toBeVisible();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Example />);

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('closes through a DialogClose control', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Example />);

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
