import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Skeleton } from '~/components/ui/Skeleton/Skeleton';

describe('Skeleton', () => {
  it('is hidden from assistive technology', () => {
    const { container } = render(<Skeleton />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('turns numeric dimensions into pixel lengths', () => {
    const { container } = render(
      <Skeleton variant="rect" width={120} height={40} />,
    );

    expect(container.firstElementChild).toHaveStyle({
      width: '120px',
      height: '40px',
    });
  });

  it('passes string dimensions through untouched', () => {
    const { container } = render(<Skeleton width="70%" />);

    expect(container.firstElementChild).toHaveStyle({ width: '70%' });
  });
});
