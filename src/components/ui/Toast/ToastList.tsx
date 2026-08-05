'use client';

import { useTranslations } from 'next-intl';
import { Toast } from '@base-ui/react/toast';

import styles from './ToastStyles.module.css';

/**
 * Renders the queued toasts. This is where i18n keys pushed through
 * `showToast` become text: the component sits inside
 * `NextIntlClientProvider`, so it has a `t` function that the imperative
 * callers do not.
 */
export function ToastList() {
  const { toasts } = Toast.useToastManager();
  const t = useTranslations();

  return toasts.map((toast) => {
    const values = (toast.data as { values?: Record<string, string | number> })
      ?.values;

    return (
      <Toast.Root key={toast.id} toast={toast} className={styles.root}>
        <Toast.Content className={styles.content}>
          <div className={styles.text}>
            <Toast.Title className={styles.title}>
              {/* Keys arrive as plain strings at runtime, so the compile-time
                  key union cannot be applied here. */}
              {t(toast.title as never, values as never)}
            </Toast.Title>
            {toast.description ? (
              <Toast.Description className={styles.description}>
                {t(toast.description as never)}
              </Toast.Description>
            ) : null}
          </div>
          <Toast.Close className={styles.close} aria-label={t('common.close')}>
            ×
          </Toast.Close>
        </Toast.Content>
      </Toast.Root>
    );
  });
}
