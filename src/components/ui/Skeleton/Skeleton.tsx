import cn from 'classnames';

import styles from './SkeletonStyles.module.css';

/**
 * Hand-written, because Base UI 1.7 has no Skeleton primitive — it ships
 * Progress and Meter, but nothing for content placeholders. This is the one
 * component in the kit with no Base UI counterpart, so if a Skeleton ever lands
 * upstream this is the file to replace.
 *
 * `aria-hidden` is not optional here: a screen reader announcing eight grey
 * boxes is noise. The loading state is announced once, by the region that owns
 * it (`aria-busy` on the list, or a `role="status"` label).
 */
type SkeletonProps = {
  variant?: 'text' | 'rect' | 'circle';
  width?: string | number;
  height?: string | number;
  className?: string;
};

const toLength = (value: string | number | undefined) =>
  typeof value === 'number' ? `${value}px` : value;

const Skeleton = ({
  variant = 'text',
  width,
  height,
  className,
}: SkeletonProps) => (
  <span
    aria-hidden="true"
    className={cn(styles.skeleton, styles[variant], className)}
    style={{ width: toLength(width), height: toLength(height) }}
  />
);

export { Skeleton };
