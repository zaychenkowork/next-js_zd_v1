import { clientEnvSchema, serverEnvSchema } from '~/schemas/env';

/**
 * The single place in the app that reads `process.env` — enforced by the
 * `no-restricted-syntax` rule in eslint.config.mjs. Everything else imports
 * `CLIENT_ENV` / `getServerEnv()` from here.
 *
 * Property access is written out literally on purpose: Next.js inlines
 * `process.env.NEXT_PUBLIC_*` at build time by static analysis, so a dynamic
 * lookup (`process.env[key]`) would silently produce `undefined` in the
 * browser.
 */
const parsedClientEnv = clientEnvSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_ENABLE_DEVTOOLS: process.env.NEXT_PUBLIC_ENABLE_DEVTOOLS,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE:
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
});

if (!parsedClientEnv.success) {
  throw new Error(
    `Invalid public environment variables:\n${formatIssues(parsedClientEnv.error)}`,
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
 * Server-only variables are read lazily: this module is also pulled into the
 * browser bundle (for `CLIENT_ENV`), and parsing server keys at module scope
 * would throw there. Call this from Server Components, Server Actions and
 * Route Handlers only.
 */
let cachedServerEnv: ReturnType<typeof serverEnvSchema.parse> | undefined;

export function getServerEnv() {
  if (cachedServerEnv) return cachedServerEnv;

  const parsed = serverEnvSchema.safeParse({
    API_URL: process.env.API_URL,
    SENTRY_ORG: process.env.SENTRY_ORG,
    SENTRY_PROJECT: process.env.SENTRY_PROJECT,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables:\n${formatIssues(parsed.error)}`,
    );
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

/** Flattens a ZodError into one readable line per offending key. */
function formatIssues(error: {
  issues: { path: (string | number | symbol)[]; message: string }[];
}) {
  return error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
}
