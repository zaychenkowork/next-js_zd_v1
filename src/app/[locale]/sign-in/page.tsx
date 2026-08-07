import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SignInForm } from '~/features/auth/SignInForm/SignInForm';

import { getOptionalProfile } from '~/server/dal/profile';

import { redirect } from '~/i18n/navigation';

import styles from './SignInPageStyles.module.css';

type SignInPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: SignInPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return {
    title: t('signInTitle'),
    robots: { index: false, follow: false },
  };
}

export default async function SignInPage({ params }: SignInPageProps) {
  const { locale } = await params;

  /**
   * `getOptionalProfile()` — the "might be signed in" DAL entry point — rather
   * than `getSession()`. Here the *token* has to be valid, not merely present: a
   * visitor with an expired session should see the sign-in form, and this is the
   * one place where paying for that check is worth it.
   */
  if (await getOptionalProfile()) {
    redirect({ href: '/profile', locale });
  }

  const t = await getTranslations('auth');

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>{t('signInTitle')}</h1>
      <p className={styles.subtitle}>{t('signInSubtitle')}</p>
      <SignInForm />
    </section>
  );
}
