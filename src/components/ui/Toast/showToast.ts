'use client';

import { toastManager } from '~/components/ui/Toast/toastManager';

export type ToastType = 'success' | 'error' | 'info';

export type ShowToastOptions = {
  /*
   * i18n key, e.g. `'cart.added'` — not a pre-translated string.
   */
  titleKey: string;
  /*
   * Optional second line, also an i18n key.
   */
  descriptionKey?: string;
  /*
   * The type of toast to display.
   */
  type?: ToastType;
  /*
   * ICU values for the title key.
   */
  values?: Record<string, string | number>;
};

/**
 * Raises a toast from anywhere on the client, including outside React.
 *
 * Message **keys** travel through the manager rather than translated strings:
 * the caller is often non-React code (a cache callback) with no access to a `t`
 * function, so translation happens at render time in `ToastList`, which sits
 * inside `NextIntlClientProvider`.
 *
 * Returns the toast's id so a caller can dismiss or update it later — a long
 * upload that reports progress, for instance.
 */
export function showToast({
  titleKey,
  descriptionKey,
  type = 'info',
  values,
}: ShowToastOptions): string {
  return toastManager.add({
    title: titleKey,
    description: descriptionKey,
    type,
    data: { values },
  });
}
