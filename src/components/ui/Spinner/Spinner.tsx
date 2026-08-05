import cn from 'classnames';

import styles from './SpinnerStyles.module.css';

type SpinnerProps = {
  size?: number;
  className?: string;
  /**
   * Screen-reader label. Omit it when the spinner sits inside a control that is
   * already labelled (a loading button) — announcing "loading" twice is worse
   * than not announcing it.
   */
  label?: string;
};

const Spinner = ({ size = 20, className, label }: SpinnerProps) => (
  <span
    className={cn(styles.spinner, className)}
    style={{ '--spinner-size': `${size}px` } as React.CSSProperties}
    role={label ? 'status' : undefined}
    aria-hidden={label ? undefined : true}
  >
    {label ? <span className="visually-hidden">{label}</span> : null}
  </span>
);

export { Spinner };
