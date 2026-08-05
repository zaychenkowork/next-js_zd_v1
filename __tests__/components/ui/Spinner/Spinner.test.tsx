import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Spinner } from '~/components/ui/Spinner/Spinner';

describe('Spinner', () => {
  it('announces itself as a status region when given a label', () => {
    render(<Spinner label="Loading" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });

  it('is hidden from assistive technology when it has no label', () => {
    const { container } = render(<Spinner />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
