'use client';

import { useTranslations } from 'next-intl';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks';

import { Button } from '~/components/ui/Button/Button';
import { ControlledTextField } from '~/components/ui/TextField/ControlledTextField';
import { showToast } from '~/components/ui/Toast/showToast';

import { updateProfileAction } from '~/server/actions/profile';

import { reportActionError } from '~/api/reportClientError';

import { updateProfileSchema, type UserProfile } from '~/schemas/user';

import styles from './ProfileFormStyles.module.css';

/**
 * Edit-profile form — the "mutate on the server, update the UI without a reload"
 * case, which is the one worth reading carefully.
 *
 * What happens on submit:
 *   1. react-hook-form validates locally and calls the Server Action;
 *   2. the action re-validates, writes through the API, and calls `refresh()`;
 *   3. the action's response carries a re-rendered RSC payload, which the client
 *      commits as a seeded navigation.
 *
 * The heading above this form — rendered by the *server* from `getProfile()` —
 * therefore shows the new name with no `router.refresh()`, no page reload, and no
 * loading state. That is the mechanism, not a trick: any Server Action that
 * revalidates, refreshes, writes a cookie or redirects returns fresh RSC output
 * in the same response.
 *
 * `defaultValues` come from the server-rendered profile, so the form is populated
 * on first paint rather than after an effect.
 */
type ProfileFormProps = {
  profile: UserProfile;
};

const ProfileForm = ({ profile }: ProfileFormProps) => {
  const t = useTranslations();

  const { form, action, handleSubmitWithAction } = useHookFormAction(
    updateProfileAction,
    standardSchemaResolver(updateProfileSchema),
    {
      formProps: {
        defaultValues: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
        },
      },
      actionProps: {
        onSuccess: () =>
          showToast({ titleKey: 'profile.updated', type: 'success' }),
        onError: ({ error }) => reportActionError(error),
      },
    },
  );

  return (
    <form onSubmit={handleSubmitWithAction} className={styles.form} noValidate>
      <div className={styles.row}>
        <ControlledTextField
          control={form.control}
          name="firstName"
          label={t('profile.firstName')}
          autoComplete="given-name"
        />

        <ControlledTextField
          control={form.control}
          name="lastName"
          label={t('profile.lastName')}
          autoComplete="family-name"
        />
      </div>

      <ControlledTextField
        control={form.control}
        name="email"
        label={t('profile.email')}
        type="email"
        autoComplete="email"
      />

      <Button
        type="submit"
        loading={action.isPending}
        disabled={!form.formState.isDirty}
        className={styles.submit}
      >
        {t('profile.save')}
      </Button>
    </form>
  );
};

export { ProfileForm };
