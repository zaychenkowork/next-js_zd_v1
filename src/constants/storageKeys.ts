/**
 * Every `localStorage` / `sessionStorage` key the app owns, in one place.
 *
 * The prefix matters in practice: during local development several apps share
 * `http://localhost`, so unprefixed keys like `theme` collide between projects
 * and produce bugs that only reproduce on one machine.
 */
export const STORAGE_KEYS = {
  theme: 'zd:theme',
} as const;
