'use client';

import { useTranslations } from 'next-intl';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks';

import { Button } from '~/components/ui/Button/Button';
import { ControlledTextField } from '~/components/ui/TextField/ControlledTextField';

import { signInAction } from '~/server/actions/auth';

import { reportActionError } from '~/api/reportClientError';

import { signInSchema } from '~/schemas/user';

import styles from './SignInFormStyles.module.css';

/**
 * The form pattern for the whole template: one zod schema, validated in two
 * places, defined once.
 *
 * `useHookFormAction` wires the three pieces together:
 *   - react-hook-form validates in the browser for instant feedback;
 *   - the same schema validates again on the server, because a client-side check
 *     is a courtesy and not a control;
 *   - `validationErrors` coming back from the action are mapped onto the matching
 *     react-hook-form fields, so a server-only rule ("this email is taken")
 *     lands under the right input instead of in a toast.
 *
 * `standardSchemaResolver`, not `zodResolver`: zod 4 implements Standard Schema
 * v1, which is the interface both react-hook-form and next-safe-action now speak.
 * One less adapter in the dependency graph.
 *
 * Validation messages in the schema are i18n **keys**. `ControlledTextField`
 * translates them at render — labels and other copy still go through `t()` here.
 */
const SignInForm = () => {
  const t = useTranslations();

  const { form, action, handleSubmitWithAction } = useHookFormAction(
    signInAction,
    standardSchemaResolver(signInSchema),
    {
      formProps: { defaultValues: { username: '', password: '' } },
      actionProps: {
        onError: ({ error }) => reportActionError(error),
      },
    },
  );

  return (
    <form onSubmit={handleSubmitWithAction} className={styles.form} noValidate>
      <ControlledTextField
        control={form.control}
        name="username"
        label={t('auth.email')}
        autoComplete="username"
      />

      <ControlledTextField
        control={form.control}
        name="password"
        label={t('auth.password')}
        type="password"
        autoComplete="current-password"
      />

      <Button type="submit" loading={action.isPending} fullWidth>
        {t('auth.submit')}
      </Button>

      <p className={styles.hint}>{t('auth.demoCredentials')}</p>
    </form>
  );
};

export { SignInForm };
