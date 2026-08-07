import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SignOutButton } from '~/features/auth/SignOutButton/SignOutButton';
import { ProfileForm } from '~/features/profile/ProfileForm/ProfileForm';

import { getProfile } from '~/server/dal/profile';

import styles from './ProfilePageStyles.module.css';

/**
 * Authorization lives in `getProfile()` — the DAL — not in this page and not in
 * `proxy.ts`.
 *
 * Next's own guidance is explicit about both halves of that. Proxy checks
 * "should not be your only line of defense", and layouts are the wrong place
 * because Partial Rendering means a layout does not re-run on client-side
 * navigation, so a check there can be skipped entirely. Putting it next to the
 * read means it runs every single time the data is read, from any caller.
 *
 * The `(account)` route group carries no URL segment: it exists to keep
 * authenticated pages visibly grouped, so "is this route protected?" is
 * answerable from the file tree.
 */
type ProfilePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'profile' });

  return {
    title: t('title'),
    robots: { index: false, follow: false },
  };
}

export default async function ProfilePage() {
  const [profile, t] = await Promise.all([
    getProfile(),
    getTranslations('profile'),
  ]);

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('title')}</h1>
          {/* Rendered by the server. It updates in place after a successful
              submit because the action's response re-renders this route. */}
          <p className={styles.identity}>
            {profile.firstName} {profile.lastName} · {profile.email}
          </p>
        </div>

        <SignOutButton />
      </header>

      <ProfileForm profile={profile} />
    </section>
  );
}
