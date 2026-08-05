import Image from 'next/image';
import { getFormatter, getTranslations } from 'next-intl/server';

import { CartQuantity } from '~/features/cart/CartLines/CartQuantity';
import { RemoveCartLineButton } from '~/features/cart/CartLines/RemoveCartLineButton';

import { Link } from '~/i18n/navigation';

import type { Cart } from '~/schemas/cart';

import { CURRENCY } from '~/constants/currency';

import styles from './CartLinesStyles.module.css';

/**
 * Server Component. The cart arrives fully hydrated from the DAL — cookie lines
 * joined with current catalog prices — and the two interactive controls are the
 * only client code on the page.
 *
 * This is the shape to copy for "mostly static page with a few live controls":
 * the markup, the money formatting and the totals stay on the server; the browser
 * only downloads the JavaScript for the stepper and the remove button.
 */
type CartLinesProps = {
  cart: Cart;
};

const CartLines = async ({ cart }: CartLinesProps) => {
  const [t, format] = await Promise.all([
    getTranslations('cart'),
    getFormatter(),
  ]);

  const money = (value: number) =>
    format.number(value, { style: 'currency', currency: CURRENCY });

  return (
    <div className={styles.wrapper}>
      <ul className={styles.list}>
        {cart.items.map(({ product, quantity, lineTotal }) => (
          <li key={product.id} className={styles.row}>
            <Image
              src={product.thumbnail}
              alt={product.title}
              width={96}
              height={96}
              className={styles.image}
              sizes="96px"
            />

            <div className={styles.info}>
              <Link
                href={`/products/${product.id}`}
                className={styles.titleLink}
              >
                {product.title}
              </Link>
              <span className={styles.unitPrice}>{money(product.price)}</span>
            </div>

            <CartQuantity
              productId={product.id}
              quantity={quantity}
              max={product.stock}
            />

            <span className={styles.lineTotal}>{money(lineTotal)}</span>

            <RemoveCartLineButton productId={product.id} />
          </li>
        ))}
      </ul>

      <footer className={styles.summary}>
        <span className={styles.itemCount}>
          {t('itemCount', { count: cart.count })}
        </span>
        <strong className={styles.total}>
          {t('total')}: {money(cart.total)}
        </strong>
      </footer>
    </div>
  );
};

export { CartLines };
