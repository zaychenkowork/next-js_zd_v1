export const LOCALES = ['uk', 'en', 'ar'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'uk';

/**
 * Language names are **endonyms** — a language's name for itself, never
 * translated. A user who lands in the wrong locale by accident has to be able
 * to recognise their own language: "Українська" is recognisable on an Arabic
 * screen, "Ukrainian" is not.
 */
export const LOCALE_NAMES: Record<Locale, string> = {
  uk: 'Українська',
  en: 'English',
  ar: 'العربية',
};

/**
 * Writing direction per locale. Nothing derives this automatically: Next.js
 * does not set `dir` on `<html>`, and Base UI's `DirectionProvider` does not
 * read it from the DOM — both are wired explicitly in the locale layout.
 * See docs/theming.md for the CSS side (logical properties only).
 */
export const LOCALE_DIRECTIONS: Record<Locale, 'ltr' | 'rtl'> = {
  uk: 'ltr',
  en: 'ltr',
  ar: 'rtl',
};
