import { notFound } from 'next/navigation';

/**
 * Without this catch-all, an unknown path under a valid locale (`/uk/nope`)
 * falls through to the *root* `app/not-found.tsx`, which has no locale and no
 * chrome. Calling `notFound()` from inside the `[locale]` segment is what makes
 * Next pick `app/[locale]/not-found.tsx` instead.
 */
export default function CatchAllPage() {
  notFound();
}
