import styles from './ErrorStateStyles.module.css';

/**
 * Shared presentation for the four error surfaces (`not-found`, `error`, the
 * global not-found and `global-error`). It takes plain strings and renders no
 * hooks, which is what lets the same component be used from a Server Component,
 * from a Client Component error boundary, and from `global-error.tsx` — where
 * there is no locale provider at all.
 */
type ErrorStateProps = {
  title: string;
  description: string;
  /** Recovery affordance — a link back, a retry button, or nothing. */
  action?: React.ReactNode;
};

export function ErrorState({ title, description, action }: ErrorStateProps) {
  return (
    <div className={styles.root}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
