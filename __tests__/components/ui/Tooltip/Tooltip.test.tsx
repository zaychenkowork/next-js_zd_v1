import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Button } from '~/components/ui/Button/Button';
import { Tooltip } from '~/components/ui/Tooltip/Tooltip';

import { renderWithProviders } from '../../../test-utils';

describe('Tooltip', () => {
  it('renders nothing until the trigger is hovered', () => {
    renderWithProviders(
      <Tooltip content="Switch theme">
        <Button aria-label="Theme">T</Button>
      </Tooltip>,
    );

    expect(screen.queryByText('Switch theme')).not.toBeInTheDocument();
  });

  it('shows its content on hover', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Tooltip content="Switch theme">
        <Button aria-label="Theme">T</Button>
      </Tooltip>,
    );

    await user.hover(screen.getByRole('button', { name: 'Theme' }));

    expect(await screen.findByText('Switch theme')).toBeVisible();
  });

  it('leaves the trigger its own accessible name, so the tooltip is not the label', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Tooltip content="Switch theme">
        <Button aria-label="Theme">T</Button>
      </Tooltip>,
    );

    await user.hover(screen.getByRole('button', { name: 'Theme' }));
    await screen.findByText('Switch theme');

    // Still findable by its own label — a control whose only name is a tooltip is
    // unusable on touch and with a screen reader.
    expect(screen.getByRole('button', { name: 'Theme' })).toBeVisible();
  });
});
