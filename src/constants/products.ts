export const PRODUCT_SORTS = ['newest', 'priceAsc', 'priceDesc'] as const;

export type ProductSort = (typeof PRODUCT_SORTS)[number];

/**
 * One page size for both owners of the list: the DAL (server-rendered page 1)
 * and the infinite query (browser-fetched pages). If they disagreed, "load
 * more" would skip or repeat items at the seam.
 */
export const PRODUCTS_PAGE_SIZE = 12;
