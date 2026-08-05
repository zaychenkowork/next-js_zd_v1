import { describe, expect, it } from 'vitest';

import {
  addToCartSchema,
  cartCookieSchema,
  setCartQuantitySchema,
} from '~/schemas/cart';

/**
 * The cart cookie is the clearest example of "trusted-looking input that isn't":
 * it is httpOnly, but it still round-trips through the user's browser and survives
 * format changes. These tests pin the guards that keep a hand-edited cookie from
 * turning one page view into hundreds of upstream requests.
 */
describe('cartCookieSchema', () => {
  it('accepts a well-formed cart', () => {
    expect(
      cartCookieSchema.parse([{ productId: 1, quantity: 2 }]),
    ).toHaveLength(1);
  });

  it('rejects more lines than a real cart would ever hold', () => {
    const oversized = Array.from({ length: 51 }, (_, index) => ({
      productId: index + 1,
      quantity: 1,
    }));

    expect(() => cartCookieSchema.parse(oversized)).toThrow();
  });

  it('rejects a zero or negative quantity', () => {
    expect(() =>
      cartCookieSchema.parse([{ productId: 1, quantity: 0 }]),
    ).toThrow();
  });

  it('rejects a non-integer product id', () => {
    expect(() =>
      cartCookieSchema.parse([{ productId: 1.5, quantity: 1 }]),
    ).toThrow();
  });
});

describe('addToCartSchema', () => {
  it('defaults the quantity to one', () => {
    expect(addToCartSchema.parse({ productId: 3 })).toEqual({
      productId: 3,
      quantity: 1,
    });
  });

  it('caps the quantity at 99', () => {
    expect(() =>
      addToCartSchema.parse({ productId: 3, quantity: 100 }),
    ).toThrow();
  });

  it('rejects a string quantity, because these actions are only called from TypeScript', () => {
    expect(() =>
      addToCartSchema.parse({ productId: 3, quantity: '2' }),
    ).toThrow();
  });
});

describe('setCartQuantitySchema', () => {
  it('allows zero, which the stepper uses to mean "remove"', () => {
    expect(
      setCartQuantitySchema.parse({ productId: 1, quantity: 0 }).quantity,
    ).toBe(0);
  });
});
