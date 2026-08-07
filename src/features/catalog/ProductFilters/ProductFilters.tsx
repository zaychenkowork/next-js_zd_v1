'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Select } from '@base-ui/react/select';

import { Button } from '~/components/ui/Button/Button';
import { TextField } from '~/components/ui/TextField/TextField';

import { usePathname, useRouter } from '~/i18n/navigation';

import type { ProductFilters as Filters } from '~/schemas/productFilters';

import { PRODUCT_SORTS, type ProductSort } from '~/constants/products';

import styles from './ProductFiltersStyles.module.css';

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Filters live in the URL, not in React state.
 *
 * That single decision buys: a shareable link, a working back button, a
 * server-renderable list, and no state to synchronise between the two. The
 * component's job is only to *write* the URL; the page reads it back through
 * `searchParams` and hands the parsed filters down as props.
 *
 * The current values arrive as props rather than from `useSearchParams` on
 * purpose. `useSearchParams` suspends during prerendering, and a component in
 * the page shell that suspends drags the whole shell into client rendering.
 * Props from the server have neither problem.
 *
 * `router.replace`, not `push`: typing four characters into a search box should
 * not put four entries in the browser's history.
 */
type ProductFiltersProps = {
  filters: Omit<Filters, 'page'>;
  categories: string[];
};

const ProductFiltersPanel = ({ filters, categories }: ProductFiltersProps) => {
  const t = useTranslations('products');
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.q);

  const applyFilters = useCallback(
    (next: Partial<Omit<Filters, 'page'>>) => {
      const merged = { ...filters, ...next };
      const params = new URLSearchParams();

      // Defaults are omitted so the canonical URL of an unfiltered list stays
      // `/products` — which matters for both sharing and SEO.
      if (merged.q) params.set('q', merged.q);
      if (merged.category) params.set('category', merged.category);
      if (merged.sort !== 'newest') params.set('sort', merged.sort);

      const search = params.toString();

      startTransition(() => {
        router.replace(search ? `${pathname}?${search}` : pathname);
      });
    },
    [filters, pathname, router],
  );

  useEffect(() => {
    if (query === filters.q) return;

    const timer = setTimeout(
      () => applyFilters({ q: query }),
      SEARCH_DEBOUNCE_MS,
    );

    return () => clearTimeout(timer);
  }, [query, filters.q, applyFilters]);

  const sortLabels: Record<ProductSort, string> = {
    newest: t('sortNewest'),
    priceAsc: t('sortPriceAsc'),
    priceDesc: t('sortPriceDesc'),
  };

  const categoryItems = {
    '': t('allCategories'),
    ...Object.fromEntries(categories.map((category) => [category, category])),
  };

  const hasFilters =
    Boolean(filters.q || filters.category) || filters.sort !== 'newest';

  return (
    <div className={styles.panel} data-pending={isPending || undefined}>
      <TextField
        label={t('search')}
        placeholder={t('searchPlaceholder')}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className={styles.search}
        type="search"
      />

      <div className={styles.field}>
        <span className={styles.label}>{t('category')}</span>
        <Select.Root
          items={categoryItems}
          value={filters.category}
          onValueChange={(value) => applyFilters({ category: value ?? '' })}
        >
          <Select.Trigger className={styles.trigger}>
            <Select.Value />
            <Select.Icon className={styles.icon}>▾</Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner className={styles.positioner} sideOffset={6}>
              <Select.Popup className={styles.popup}>
                <Select.List className={styles.list}>
                  {Object.entries(categoryItems).map(([value, label]) => (
                    <Select.Item
                      key={value || 'all'}
                      value={value}
                      className={styles.item}
                    >
                      <Select.ItemText>{label}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>{t('sort')}</span>
        <Select.Root
          items={sortLabels}
          value={filters.sort}
          onValueChange={(value) =>
            applyFilters({ sort: (value as ProductSort) ?? 'newest' })
          }
        >
          <Select.Trigger className={styles.trigger}>
            <Select.Value />
            <Select.Icon className={styles.icon}>▾</Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner className={styles.positioner} sideOffset={6}>
              <Select.Popup className={styles.popup}>
                <Select.List className={styles.list}>
                  {PRODUCT_SORTS.map((sort) => (
                    <Select.Item
                      key={sort}
                      value={sort}
                      className={styles.item}
                    >
                      <Select.ItemText>{sortLabels[sort]}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </div>

      {hasFilters ? (
        <Button
          variant="ghost"
          size="s"
          className={styles.reset}
          onClick={() => {
            setQuery('');
            applyFilters({ q: '', category: '', sort: 'newest' });
          }}
        >
          {t('resetFilters')}
        </Button>
      ) : null}
    </div>
  );
};

export { ProductFiltersPanel };
