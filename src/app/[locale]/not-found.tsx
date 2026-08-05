import { useTranslations } from 'next-intl';

import { ErrorState } from '~/components/ErrorState/ErrorState';

import { Link } from '~/i18n/navigation';

/**
 * Rendered for `notFound()` raised anywhere under `[locale]` — including the
 * `[...rest]` catch-all. Still a Server Component: `useTranslations` works in
 * RSC, it is not a client-only hook.
 */
export default function LocaleNotFound() {
  const t = useTranslations();

  return (
    <ErrorState
      title={t('errors.notFoundTitle')}
      description={t('errors.notFoundBody')}
      action={<Link href="/">{t('errors.backHome')}</Link>}
    />
  );
}
