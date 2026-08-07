'use client';

import {
  type Control,
  type FieldPath,
  type FieldValues,
  useController,
} from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { TextField, type TextFieldProps } from './TextField';

/**
 * `TextField` bound to react-hook-form.
 *
 * Subscribes to the field and re-renders on every change. Prefer this over
 * `{...register()}` when wiring forms: schema validation messages are i18n
 * **keys**, and this component translates them at render time (same reason
 * `ToastList` calls `t()` — the key arrives as a plain string from outside
 * the locale boundary).
 *
 * Pass an already-translated `error` to override the schema message.
 */
type ControlledTextFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = Omit<TextFieldProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'ref'> & {
  control: Control<TFieldValues>;
  name: TName;
};

const ControlledTextField = <
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  error,
  ...textFieldProps
}: ControlledTextFieldProps<TFieldValues, TName>) => {
  const t = useTranslations();
  const { field, fieldState } = useController({ control, name });
  const { value } = field;

  const message = fieldState.error?.message;
  const resolvedError = error ?? (message ? t(message) : undefined);

  return (
    <TextField
      {...textFieldProps}
      {...field}
      value={value ?? ''}
      error={resolvedError}
    />
  );
};

export { ControlledTextField };
