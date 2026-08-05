import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '~/components/ui/Button/Button';

/**
 * Queried by role and accessible name throughout — never by `data-testid`. A test
 * that finds a button the way a screen reader does fails when the button stops
 * being reachable, which is exactly when you want to know.
 */
describe('Button', () => {
  it('renders its children as the accessible name', () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole('button', { name: 'Click me' })).toBeVisible();
  });

  it('defaults to type="button" so it cannot accidentally submit a form', () => {
    render(<Button>Safe</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('calls onClick once per click', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Go</Button>);

    await user.click(screen.getByRole('button', { name: 'Go' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={onClick} disabled>
        Go
      </Button>,
    );

    await user.click(screen.getByRole('button', { name: 'Go' }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('keeps its accessible name while loading and marks itself busy', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={onClick} loading>
        Saving
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Saving' });

    expect(button).toHaveAttribute('aria-busy', 'true');

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('stays focusable while loading so its state can be announced', () => {
    render(<Button loading>Saving</Button>);

    screen.getByRole('button', { name: 'Saving' }).focus();

    expect(screen.getByRole('button', { name: 'Saving' })).toHaveFocus();
  });
});
