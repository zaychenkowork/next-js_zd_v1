import { describe, expect, it } from 'vitest';

import {
  categoryListSchema,
  productListSchema,
  productSchema,
} from '~/schemas/product';

const valid = {
  id: 1,
  title: 'Thing',
  description: 'A thing.',
  category: 'things',
  price: 9.99,
  rating: 4.2,
  stock: 3,
  thumbnail: 'https://cdn.example.com/thing.webp',
};

describe('productSchema', () => {
  it('strips fields the app does not depend on', () => {
    const parsed = productSchema.parse({ ...valid, warrantyInformation: '1y' });

    expect(parsed).not.toHaveProperty('warrantyInformation');
    expect(parsed.title).toBe('Thing');
  });

  it('rejects a response missing a required field', () => {
    const withoutPrice = Object.fromEntries(
      Object.entries(valid).filter(([key]) => key !== 'price'),
    );

    expect(() => productSchema.parse(withoutPrice)).toThrow();
  });

  it('rejects a price sent as a string', () => {
    expect(() => productSchema.parse({ ...valid, price: '9.99' })).toThrow();
  });
});

describe('productListSchema', () => {
  it('keeps the paging fields the infinite query depends on', () => {
    const parsed = productListSchema.parse({
      products: [valid],
      total: 100,
      skip: 12,
      limit: 12,
    });

    expect(parsed.skip + parsed.limit).toBe(24);
  });
});

describe('categoryListSchema', () => {
  it('accepts a flat list of strings', () => {
    expect(categoryListSchema.parse(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('rejects the object form some APIs return instead', () => {
    expect(() => categoryListSchema.parse([{ slug: 'a' }])).toThrow();
  });
});
