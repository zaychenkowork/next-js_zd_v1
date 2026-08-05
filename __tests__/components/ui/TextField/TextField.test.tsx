import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TextField } from '~/components/ui/TextField/TextField';

describe('TextField', () => {
  it('associates the label with the input', () => {
    render(<TextField label="Email" name="email" />);

    expect(screen.getByLabelText('Email')).toBeVisible();
  });

  it('shows the error message when one is passed in', () => {
    render(
      <TextField label="Email" name="email" error="Enter a valid email" />,
    );

    expect(screen.getByText('Enter a valid email')).toBeVisible();
  });

  it('marks the control invalid so it can be styled and announced', () => {
    render(<TextField label="Email" name="email" error="Required" />);

    expect(screen.getByLabelText('Email')).toHaveAttribute('data-invalid');
  });

  it('renders no error element when there is no error', () => {
    render(<TextField label="Email" name="email" description="Work address" />);

    expect(screen.getByLabelText('Email')).not.toHaveAttribute('data-invalid');
    expect(screen.getByText('Work address')).toBeVisible();
  });

  it('forwards typing to the change handler', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TextField label="Email" name="email" onChange={onChange} />);

    await user.type(screen.getByLabelText('Email'), 'ab');

    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('exposes the ref as a plain prop, the way register() supplies it', () => {
    const ref = vi.fn();
    render(<TextField label="Email" name="email" ref={ref} />);

    expect(ref).toHaveBeenCalled();
  });
});
