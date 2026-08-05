import cn from 'classnames';

import { Skeleton } from '~/components/ui/Skeleton/Skeleton';

import styles from './ProductGridStyles.module.css';

/**
 * Layout only — it has no idea where the products came from. That is what lets
 * the same grid serve the server-rendered featured list and the client-side
 * infinite list.
 */
type ProductGridProps = {
  children: React.ReactNode;
  className?: string;
};

const ProductGrid = ({ children, className }: ProductGridProps) => (
  <div className={cn(styles.grid, className)}>{children}</div>
);

/**
 * The loading shape for the grid. `aria-busy` and the label live here, on the
 * region, rather than on each placeholder — one announcement instead of twelve.
 */
const ProductGridSkeleton = ({
  count = 8,
  label,
}: {
  count?: number;
  label: string;
}) => (
  <div className={styles.grid} aria-busy="true" aria-label={label}>
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className={styles.skeletonCard}>
        <Skeleton variant="rect" className={styles.skeletonMedia} />
        <Skeleton variant="text" width="70%" />
        <Skeleton variant="text" width="40%" />
      </div>
    ))}
  </div>
);

export { ProductGrid, ProductGridSkeleton };
