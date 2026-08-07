import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { showToast } from '~/components/ui/Toast/showToast';
import { ToastList } from '~/components/ui/Toast/ToastList';
import { toastManager } from '~/components/ui/Toast/toastManager';

import { renderWithProviders } from '../../../test-utils';

/**
 * The behaviour worth locking down is the seam: `showToast` is called from
 * non-React code (a query cache callback, an action's `onError`) and can only pass
 * an i18n **key**. Translation happens later, in `ToastList`, which is the only
 * one of the two that sits inside a locale provider.
 *
 * Messages come from `src/i18n/messages/uk.json` via test-utils, so a renamed
 * key fails here instead of shipping.
 */
describe('ToastList', () => {
  /**
   * The manager is a module-level singleton, so it outlives Testing Library's
   * unmount and carries queued toasts into the next test. `close()` with no id
   * clears all of them.
   */
  afterEach(() => {
    toastManager.close();
  });

  it('translates the key it was given rather than printing it', async () => {
    renderWithProviders(<ToastList />);

    showToast({ titleKey: 'cart.added', type: 'success' });

    await waitFor(() => {
      expect(screen.getByText('Додано в кошик')).toBeVisible();
    });
  });

  it('renders a description when one is supplied', async () => {
    renderWithProviders(<ToastList />);

    showToast({
      titleKey: 'errors.unexpectedTitle',
      descriptionKey: 'errors.unexpectedBody',
      type: 'error',
    });

    await waitFor(() => {
      expect(screen.getByText('Неочікувана помилка')).toBeVisible();
    });
    expect(
      screen.getByText('Ми отримали повідомлення та розбираємося.'),
    ).toBeVisible();
  });

  it('interpolates values into a message that takes them', async () => {
    renderWithProviders(<ToastList />);

    showToast({
      titleKey: 'products.inStock',
      type: 'success',
      values: { count: 7 },
    });

    await waitFor(() => {
      expect(screen.getByText('У наявності: 7')).toBeVisible();
    });
  });
});
