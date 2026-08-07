import { z } from 'zod';

import { clientEnvSchema, serverEnvSchema } from '~/schemas/env';

/**
 * The single place in the app that reads `process.env` — enforced by the
 * `no-restricted-syntax` rule in eslint.config.mjs. Everything else imports
 * `CLIENT_ENV` / `getServerEnv()` from here, or `CONFIG` from
 * `~/config/config` for app values that are not environment variables.
 *
 * Property access is written out literally on purpose: Next.js inlines
 * `process.env.NEXT_PUBLIC_*` into the browser bundle by static analysis, so
 * neither a dynamic lookup (`process.env[key]`) nor a whole-object read
 * (`const env = process.env`) survives — both produce `undefined` in the
 * browser with no error.
 *
 * The `satisfies` clause is what keeps that literal honest: a key added to the
 * schema and forgotten here becomes a type error instead of a runtime
 * validation failure on someone else's machine.
 */
const rawClientEnv = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_ENABLE_DEVTOOLS: process.env.NEXT_PUBLIC_ENABLE_DEVTOOLS,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE:
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
} satisfies Record<keyof z.input<typeof clientEnvSchema>, string | undefined>;

const parsedClientEnv = clientEnvSchema.safeParse(rawClientEnv);

if (!parsedClientEnv.success) {
  throw new Error(
    `Invalid public environment variables:\n${z.prettifyError(parsedClientEnv.error)}`,
  );
}

export const CLIENT_ENV = parsedClientEnv.data;

/**
 * `NODE_ENV` is set by Next itself, never by `.env`, so it is not part of the
 * validated schemas. Exported as a boolean so no other file needs to touch
 * `process.env` just to ask "are we in production?".
 */
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Injected by the `env` key in next.config.ts from package.json's `version`,
 * so the number has one source of truth and cannot drift. It lives here rather
 * than in `~/config/config` only because this is the one file allowed to read
 * `process.env`.
 *
 * The fallback is not dead code: `next.config.ts` does not run under Vitest or
 * Storybook, so the variable is genuinely absent there.
 */
export const APP_VERSION = process.env.APP_VERSION ?? '0.0.0';

/**
 * Server-only variables are read lazily: this module is also pulled into the
 * browser bundle (for `CLIENT_ENV`), and parsing server keys at module scope
 * would throw there. That is not hypothetical — `src/api/client.ts` is
 * isomorphic and imports both halves, which is why this cannot become a plain
 * const or move to a `server-only` module. Call it from Server Components,
 * Server Actions and Route Handlers only.
 */
let cachedServerEnv: ReturnType<typeof serverEnvSchema.parse> | undefined;

export function getServerEnv() {
  if (cachedServerEnv) return cachedServerEnv;

  const rawServerEnv = {
    API_URL: process.env.API_URL,
    SENTRY_ORG: process.env.SENTRY_ORG,
    SENTRY_PROJECT: process.env.SENTRY_PROJECT,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
  } satisfies Record<keyof z.input<typeof serverEnvSchema>, string | undefined>;

  const parsed = serverEnvSchema.safeParse(rawServerEnv);

  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables:\n${z.prettifyError(parsed.error)}`,
    );
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}
