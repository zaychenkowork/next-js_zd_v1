import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ControlledTextField } from '~/components/ui/TextField/ControlledTextField';

import { renderWithProviders } from '../../../test-utils';

const schema = z.object({
  email: z.string().pipe(z.email('validation.email')),
});

function Harness({ error }: { error?: string }) {
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
        error={error}
      />
      <button type="submit">Submit</button>
    </form>
  );
}

describe('ControlledTextField', () => {
  it('reflects typed input back into the field', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    await user.type(screen.getByLabelText('Email'), 'a@b.co');

    expect(screen.getByLabelText('Email')).toHaveValue('a@b.co');
  });

  it('translates the schema validation key at render', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(
      await screen.findByText('Введіть коректну електронну пошту'),
    ).toBeVisible();
  });

  it('prefers an explicit error over the schema message', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness error="Custom error" />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Custom error')).toBeVisible();
    expect(
      screen.queryByText('Введіть коректну електронну пошту'),
    ).not.toBeInTheDocument();
  });

  it('marks the control invalid once validation has failed', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await screen.findByText('Введіть коректну електронну пошту');

    expect(screen.getByLabelText('Email')).toHaveAttribute('data-invalid');
  });
});
