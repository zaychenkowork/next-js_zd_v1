import { Button as BaseButton } from '@base-ui/react/button';
import cn from 'classnames';

import { Spinner } from '~/components/ui/Spinner/Spinner';

import styles from './ButtonStyles.module.css';

/**
 * Wraps Base UI's `Button` rather than a bare `<button>`. What that buys:
 * `focusableWhenDisabled` (a disabled button that a keyboard user can still
 * reach and read), consistent `data-disabled` styling hooks, and correct
 * behaviour when `render` is used to turn the button into a link.
 *
 * No `'use client'` directive here on purpose. This component has no hooks, so
 * it stays a *shared* module: a Server Component can render it, and a Client
 * Component importing it pulls it into the client graph automatically. Adding
 * the directive would push it into every client bundle for no reason.
 */
type ButtonProps = Omit<BaseButton.Props, 'children'> & {
  children?: React.ReactNode;
  /**
   * - `primary` — filled, one per view
   * - `secondary` — outlined
   * - `ghost` — text only
   * - `danger` — destructive
   */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 's' | 'm' | 'l';
  /** Shows a spinner and blocks interaction. Implies `disabled`. */
  loading?: boolean;
  fullWidth?: boolean;
};

const Button = ({
  children,
  variant = 'primary',
  size = 'm',
  loading = false,
  fullWidth = false,
  disabled,
  className,
  type = 'button',
  ...props
}: ButtonProps) => (
  <BaseButton
    {...props}
    type={type}
    disabled={disabled || loading}
    /**
     * Keeps a submitting button reachable by keyboard so its label — and the
     * `aria-busy` state below — stay announceable while the request is in
     * flight.
     */
    focusableWhenDisabled={loading}
    aria-busy={loading || undefined}
    className={cn(
      styles.button,
      styles[variant],
      styles[`size-${size}`],
      { [styles.fullWidth]: fullWidth, [styles.loading]: loading },
      className,
    )}
  >
    {loading ? <Spinner size={size === 's' ? 14 : 16} /> : null}
    <span className={styles.label}>{children}</span>
  </BaseButton>
);

export { Button };
export type { ButtonProps };
