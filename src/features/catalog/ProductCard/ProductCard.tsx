import Image from 'next/image';
import { useFormatter, useTranslations } from 'next-intl';

import { Link } from '~/i18n/navigation';

import type { Product } from '~/schemas/product';

import { CURRENCY } from '~/constants/currency';

import styles from './ProductCardStyles.module.css';

/**
 * A *shared* component: no `'use client'`, no hooks that need a browser. It is
 * rendered on the server by the featured grid on the home page and on the client
 * by the infinite list on /products, from the same file.
 *
 * next-intl's `useFormatter` works in both environments, which is what lets a
 * price be formatted once and correctly per locale — including RTL, where the
 * currency symbol moves on its own.
 *
 * The action slot is a `children` prop rather than an `onAddToCart` callback.
 * That is what keeps the card server-renderable: a function cannot cross the
 * server/client boundary, but a client element passed as `children` can.
 */
type ProductCardProps = {
  product: Product;
  /** Action slot — typically `<AddToCartButton />`. */
  children?: React.ReactNode;
};

const ProductCard = ({ product, children }: ProductCardProps) => {
  const t = useTranslations('products');
  const format = useFormatter();

  return (
    <article className={styles.card}>
      {/**
       * The image is *not* wrapped in its own link. Two links to the same page
       * with the same accessible name is a real accessibility problem — a screen
       * reader user hears every product twice — and it is why the card uses the
       * "block link" pattern instead: the title is the only anchor, and its
       * `::after` pseudo-element covers the whole card so the image is still
       * clickable. `alt` stays meaningful for image-search and broken-image cases.
       */}
      <div className={styles.media}>
        <Image
          src={product.thumbnail}
          alt={product.title}
          width={320}
          height={320}
          className={styles.image}
          /**
           * `sizes` is not optional for a responsive grid image: without it Next
           * serves the largest candidate to every viewport, which is the most
           * common cause of a "why is my LCP 4s" report.
           */
          sizes="(max-width: 600px) 50vw, (max-width: 1000px) 33vw, 240px"
        />
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>
          <Link href={`/products/${product.id}`} className={styles.titleLink}>
            {product.title}
          </Link>
        </h3>

        <p className={styles.price}>
          {format.number(product.price, {
            style: 'currency',
            currency: CURRENCY,
          })}
        </p>

        <p className={styles.stock}>
          {product.stock > 0
            ? t('inStock', { count: product.stock })
            : t('outOfStock')}
        </p>

        {children ? <div className={styles.action}>{children}</div> : null}
      </div>
    </article>
  );
};

export { ProductCard };
