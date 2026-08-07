import { z } from 'zod';

/**
 * Environment is validated in two halves because Next.js exposes them
 * differently: only `NEXT_PUBLIC_`-prefixed variables are inlined into the
 * browser bundle, everything else exists on the server alone. Validating one
 * combined schema would therefore fail on the client for server-only keys.
 *
 * Only the shapes live here; src/config/env.ts does the reading and parsing and
 * is the one file allowed to touch `process.env`. See docs/conventions.md.
 */
export const serverEnvSchema = z.object({
  API_URL: z.url(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
});

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  /**
   * The browser-side base URL for the same API `API_URL` points at. Two
   * variables rather than one because the two callers are not the same client:
   * server-side requests can use an internal address the browser cannot resolve
   * (a service name, a private DNS entry), and `API_URL` must never be inlined
   * into the bundle. See docs/api-layer.md.
   */
  NEXT_PUBLIC_API_URL: z.url(),
  NEXT_PUBLIC_ENABLE_DEVTOOLS: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: z.coerce
    .number()
    .min(0)
    .max(1)
    .optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
