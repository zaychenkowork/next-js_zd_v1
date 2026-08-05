'use client';

import {
  type Control,
  type FieldPath,
  type FieldValues,
  useController,
} from 'react-hook-form';

import { TextField, type TextFieldProps } from './TextField';

/**
 * `TextField` bound to react-hook-form.
 *
 * Both variants exist because the choice is not cosmetic:
 *
 *   - `<TextField {...register('email')} error={...} />` keeps the input
 *     uncontrolled. React never re-renders on keystrokes, which is why
 *     react-hook-form is fast. Use it by default.
 *   - `<ControlledTextField control={control} name="email" />` subscribes to the
 *     field and re-renders on every change. Needed when a value has to drive
 *     something else as you type (a dependent field, a live preview) or when the
 *     control is not a native input.
 *
 * The one thing this component does *not* do is translate. `error` is passed in
 * already localised — validation messages in the zod schemas are i18n keys, so
 * the form resolves them with `t()` before they get here. See docs/forms.md.
 */
type ControlledTextFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = Omit<TextFieldProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'ref'> & {
  control: Control<TFieldValues>;
  name: TName;
  /** Maps the raw validation message (an i18n key) to display text. */
  translateError?: (message: string) => string;
};

const ControlledTextField = <
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  translateError,
  error,
  ...textFieldProps
}: ControlledTextFieldProps<TFieldValues, TName>) => {
  const { field, fieldState } = useController({ control, name });
  const { value } = field;

  const message = fieldState.error?.message;
  const resolvedError =
    error ?? (message ? (translateError?.(message) ?? message) : undefined);

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
