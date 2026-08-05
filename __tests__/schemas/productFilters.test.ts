import { describe, expect, it } from 'vitest';

import { parseProductFilters } from '~/schemas/productFilters';

/**
 * `searchParams` is user input: hand-edited URLs, stale bookmarks, crawlers
 * appending junk. Every one of these cases has to produce a renderable page, not
 * a 500 — which is the whole reason the schema uses `.catch()` instead of failing.
 */
describe('parseProductFilters', () => {
  it('falls back to defaults for an empty query string', () => {
    expect(parseProductFilters({})).toEqual({
      q: '',
      category: '',
      sort: 'newest',
      page: 1,
    });
  });

  it('reads valid values through unchanged', () => {
    expect(
      parseProductFilters({
        q: 'phone',
        category: 'smartphones',
        sort: 'priceAsc',
        page: '3',
      }),
    ).toEqual({
      q: 'phone',
      category: 'smartphones',
      sort: 'priceAsc',
      page: 3,
    });
  });

  it('trims whitespace around the search term', () => {
    expect(parseProductFilters({ q: '  phone  ' }).q).toBe('phone');
  });

  it('falls back to the default sort for an unknown value', () => {
    expect(parseProductFilters({ sort: 'cheapest' }).sort).toBe('newest');
  });

  it.each([['banana'], ['0'], ['-2'], ['1.5']])(
    'falls back to page 1 for page=%s',
    (page) => {
      expect(parseProductFilters({ page }).page).toBe(1);
    },
  );

  it('takes the first value when a param is repeated', () => {
    expect(parseProductFilters({ category: ['a', 'b'] }).category).toBe('a');
  });
});
