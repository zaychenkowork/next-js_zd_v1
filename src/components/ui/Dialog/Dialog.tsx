'use client';

import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import cn from 'classnames';

import styles from './DialogStyles.module.css';

/**
 * Base UI's Dialog, with the boilerplate parts pre-assembled and styled.
 *
 * Named exports rather than a `Dialog.*` object: the composition stays visible
 * at the call site (this is the whole point of a headless kit), and the layer
 * rules in eslint.config.mjs forbid barrel files, so one import per part is the
 * house style anyway.
 *
 * `DialogContent` bundles Portal + Backdrop + Viewport + Popup because getting
 * that nesting wrong is the single most common Base UI mistake — `Viewport` is
 * what makes a tall dialog scroll instead of overflowing the screen, and it is
 * easy to leave out.
 *
 * `'use client'` is here for real: `Dialog.Root` manages open state and focus
 * trapping, so this subtree cannot render on the server alone.
 *
 * For confirmations that must not be dismissed by a stray Escape, use Base UI's
 * `AlertDialog` instead — same parts, no outside-click close.
 */
const DialogRoot = BaseDialog.Root;
const DialogTrigger = BaseDialog.Trigger;
const DialogClose = BaseDialog.Close;

type DialogContentProps = BaseDialog.Popup.Props & {
  /** Width cap for the popup. Defaults to a comfortable reading measure. */
  maxWidth?: string;
};

const DialogContent = ({
  children,
  className,
  maxWidth,
  ...props
}: DialogContentProps) => (
  <BaseDialog.Portal>
    <BaseDialog.Backdrop className={styles.backdrop} />
    <BaseDialog.Viewport className={styles.viewport}>
      <BaseDialog.Popup
        {...props}
        className={cn(styles.popup, className)}
        style={maxWidth ? { maxWidth } : undefined}
      >
        {children}
      </BaseDialog.Popup>
    </BaseDialog.Viewport>
  </BaseDialog.Portal>
);

const DialogTitle = ({ className, ...props }: BaseDialog.Title.Props) => (
  <BaseDialog.Title {...props} className={cn(styles.title, className)} />
);

const DialogDescription = ({
  className,
  ...props
}: BaseDialog.Description.Props) => (
  <BaseDialog.Description
    {...props}
    className={cn(styles.description, className)}
  />
);

const DialogFooter = ({
  className,
  ...props
}: React.ComponentProps<'footer'>) => (
  <footer {...props} className={cn(styles.footer, className)} />
);

export {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
};
