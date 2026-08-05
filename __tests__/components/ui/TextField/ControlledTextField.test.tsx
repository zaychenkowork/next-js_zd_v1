import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ControlledTextField } from '~/components/ui/TextField/ControlledTextField';

const schema = z.object({
  email: z.string().pipe(z.email('validation.email')),
});

function Harness({
  translateError,
}: {
  translateError?: (message: string) => string;
}) {
  const { control, handleSubmit } = useForm({
    resolver: standardSchemaResolver(schema),
    defaultValues: { email: '' },
  });

  return (
    <form onSubmit={handleSubmit(() => {})} noValidate>
      <ControlledTextField
        control={control}
        name="email"
        label="Email"
        translateError={translateError}
      />
      <button type="submit">Submit</button>
    </form>
  );
}

describe('ControlledTextField', () => {
  it('reflects typed input back into the field', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Email'), 'a@b.co');

    expect(screen.getByLabelText('Email')).toHaveValue('a@b.co');
  });

  it('shows the raw validation key when no translator is given', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('validation.email')).toBeVisible();
  });

  it('runs the validation key through the supplied translator', async () => {
    const user = userEvent.setup();
    render(<Harness translateError={() => 'Введіть коректну пошту'} />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Введіть коректну пошту')).toBeVisible();
  });

  it('marks the control invalid once validation has failed', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await screen.findByText('validation.email');

    expect(screen.getByLabelText('Email')).toHaveAttribute('data-invalid');
  });
});
