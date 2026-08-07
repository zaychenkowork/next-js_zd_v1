import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { ThemeSwitcher } from '~/components/ThemeSwitcher/ThemeSwitcher';

import { STORAGE_KEYS } from '~/constants/storageKeys';

import messages from '../../../src/i18n/messages/uk.json';
import { renderWithProviders } from '../../test-utils';

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('toggles the resolved theme and persists the choice', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ThemeSwitcher />);

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('light');
    });

    await user.click(
      screen.getByRole('button', { name: messages.nav.toggleTheme }),
    );

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('dark');
  });
});
