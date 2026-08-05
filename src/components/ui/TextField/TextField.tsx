import { Field } from '@base-ui/react/field';
import cn from 'classnames';

import styles from './TextFieldStyles.module.css';

/**
 * A labelled text input built from Base UI's `Field` parts.
 *
 * Base UI's Field has its own validation engine, but this component hands
 * control to the caller instead: `invalid` and `Field.Error match` are the props
 * its docs describe as "useful when the field state is controlled by an external
 * library" — which is exactly the react-hook-form + zod setup this template
 * uses. Two validation engines fighting over one input is a class of bug worth
 * designing out.
 *
 * `error` is an already-translated string. `components/ui` deliberately knows
 * nothing about i18n: keeping `t()` at the call site is what keeps these
 * primitives renderable in Storybook and in tests without a provider.
 *
 * `ref` is a plain prop — React 19 forwards it to function components without
 * `forwardRef`, which is what makes `{...register('email')}` work unchanged.
 */
type TextFieldProps = Omit<Field.Control.Props, 'className'> & {
  label: string;
  description?: string;
  error?: string;
  className?: string;
  controlClassName?: string;
};

const TextField = ({
  label,
  description,
  error,
  className,
  controlClassName,
  ...controlProps
}: TextFieldProps) => (
  <Field.Root
    className={cn(styles.root, className)}
    invalid={Boolean(error)}
    name={controlProps.name}
  >
    <Field.Label className={styles.label}>{label}</Field.Label>

    <Field.Control
      {...controlProps}
      className={cn(styles.control, controlClassName)}
    />

    {description ? (
      <Field.Description className={styles.description}>
        {description}
      </Field.Description>
    ) : null}

    {/* `match` takes over visibility from Base UI's own ValidityState checks. */}
    <Field.Error match={Boolean(error)} className={styles.error}>
      {error}
    </Field.Error>
  </Field.Root>
);

export { TextField };
export type { TextFieldProps };
