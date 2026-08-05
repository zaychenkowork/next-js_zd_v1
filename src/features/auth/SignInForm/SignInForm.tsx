'use client';

import { useTranslations } from 'next-intl';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks';

import { Button } from '~/components/ui/Button/Button';
import { TextField } from '~/components/ui/TextField/TextField';

import { signInAction } from '~/server/actions/auth';

import { reportActionError } from '~/api/reportError';

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
 * Validation messages in the schema are i18n **keys**. They are translated here,
 * at the point of display — the only place that knows the user's locale.
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

  const errorKey = (name: 'username' | 'password') => {
    const message = form.formState.errors[name]?.message;
    return message ? t(message as never) : undefined;
  };

  return (
    <form onSubmit={handleSubmitWithAction} className={styles.form} noValidate>
      <TextField
        label={t('auth.email')}
        autoComplete="username"
        error={errorKey('username')}
        {...form.register('username')}
      />

      <TextField
        label={t('auth.password')}
        type="password"
        autoComplete="current-password"
        error={errorKey('password')}
        {...form.register('password')}
      />

      <Button type="submit" loading={action.isPending} fullWidth>
        {t('auth.submit')}
      </Button>

      <p className={styles.hint}>{t('auth.demoCredentials')}</p>
    </form>
  );
};

export { SignInForm };
