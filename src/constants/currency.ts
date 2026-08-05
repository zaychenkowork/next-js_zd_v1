/**
 * Presentation currency. A real store reads this per market (and prices come
 * from the API in minor units), but a template needs one honest constant rather
 * than a hardcoded `$` scattered across components.
 *
 * Formatting itself goes through next-intl's `useFormatter().number(...)`, which
 * places the symbol and separators per locale — `1 234,56 $` in `uk`,
 * `$1,234.56` in `en`, and the correct direction in `ar`.
 */
export const CURRENCY = 'USD';
