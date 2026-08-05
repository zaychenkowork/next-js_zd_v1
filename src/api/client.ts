import type { ZodType } from 'zod';

import { ApiError, RESPONSE_VALIDATION_FAILED } from '~/api/errors';

import { CLIENT_ENV, getServerEnv } from '~/config/env';

/**
 * The one HTTP entry point in the app. Server Components, the Data Access Layer,
 * Server Actions, Route Handlers and TanStack Query `queryFn`s all go through
 * `apiFetch` — there is deliberately no second client, no axios instance and no
 * "server version" of this file.
 *
 * ## Two base URLs, one client
 *
 * The only thing that differs between environments is where the request goes:
 * `API_URL` on the server (may be an internal address), `NEXT_PUBLIC_API_URL` in
 * the browser. Everything else — JSON handling, error normalisation, response
 * validation, timeouts — is shared.
 *
 * ## What this file deliberately does NOT do
 *
 * It never reads `cookies()`. Two reasons: `next/headers` cannot exist in a
 * module the browser also bundles, and reading cookies opts the caller out of
 * static rendering. Server-side auth is attached explicitly by the Data Access
 * Layer via `getAuthHeaders()` (src/server/session.ts) — the layer that is
 * supposed to know who is asking. In the browser, `credentials: 'include'` lets
 * the browser attach the session cookie itself.
 *
 * ## Caching is always explicit
 *
 * Since Next 15 a bare `fetch` is not cached; Next 16.3 confirms it in
 * `patch-fetch.js` — with no `cache` and no `next.revalidate` it sets
 * `autoNoCache = true` at runtime. So every cacheable read passes
 * `next: { revalidate, tags }` (or `cache: 'force-cache'`) on purpose. Next also
 * force-disables the Data Cache for any request carrying a `cookie` or
 * `authorization` header, which is exactly why per-user reads in the DAL are
 * uncached without anyone having to remember to say so.
 *
 * See docs/api-layer.md.
 */

const DEFAULT_TIMEOUT_MS = 15_000;

type SearchParamValue = string | number | boolean | null | undefined;

export type ApiFetchOptions<T> = Omit<RequestInit, 'body'> & {
  /**
   * Validates the response body. Passing a schema is the norm: an API that
   * quietly changes shape should fail at the boundary with a readable error, not
   * three components deep as `Cannot read properties of undefined`.
   */
  schema?: ZodType<T>;
  /** Serialised as JSON. Pass a `FormData`/`Blob` through `rawBody` instead. */
  body?: unknown;
  rawBody?: BodyInit;
  /** `undefined`, `null` and `''` entries are dropped. */
  searchParams?: Record<string, SearchParamValue>;
  /** Set to `0` to disable. */
  timeoutMs?: number;
};

const IS_SERVER = typeof window === 'undefined';

function resolveBaseUrl() {
  return IS_SERVER ? getServerEnv().API_URL : CLIENT_ENV.NEXT_PUBLIC_API_URL;
}

function buildUrl(
  path: string,
  searchParams?: Record<string, SearchParamValue>,
) {
  const url = new URL(
    path.replace(/^\//, ''),
    `${resolveBaseUrl().replace(/\/$/, '')}/`,
  );

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }

  return url;
}

function resolveSignal(
  signal: AbortSignal | null | undefined,
  timeoutMs: number,
) {
  if (timeoutMs <= 0) return signal ?? undefined;
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) return null;

  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    // Not JSON — hand the raw text to the error path or the schema, whichever
    // is asking. Swallowing it would hide HTML error pages from proxies.
    return text;
  }
}

function extractErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === 'string' && payload) return payload;

  if (payload && typeof payload === 'object') {
    const { message } = payload as { message?: unknown };
    if (typeof message === 'string' && message) return message;
  }

  return fallback;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions<T> = {},
): Promise<T> {
  const {
    schema,
    body,
    rawBody,
    searchParams,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    headers,
    signal,
    ...init
  } = options;

  const url = buildUrl(path, searchParams);
  const requestHeaders = new Headers(headers);
  let requestBody = rawBody;

  if (body !== undefined) {
    requestBody = JSON.stringify(body);
    if (!requestHeaders.has('content-type')) {
      requestHeaders.set('content-type', 'application/json');
    }
  }

  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers: requestHeaders,
      body: requestBody,
      signal: resolveSignal(signal, timeoutMs),
      // Cross-origin cookie sessions need this; on the server it is a no-op.
      credentials: init.credentials ?? (IS_SERVER ? undefined : 'include'),
    });
  } catch (cause) {
    const isTimeout = cause instanceof Error && cause.name === 'TimeoutError';

    throw new ApiError({
      message: isTimeout
        ? `Request to ${url.pathname} timed out after ${timeoutMs}ms`
        : `Request to ${url.pathname} failed before a response was received`,
      status: 0,
      url: url.toString(),
      code: isTimeout ? 'TIMEOUT' : 'TRANSPORT',
      cause,
    });
  }

  const payload = await readBody(response);

  if (!response.ok) {
    throw new ApiError({
      message: extractErrorMessage(
        payload,
        `${response.status} ${response.statusText || 'Request failed'}`,
      ),
      status: response.status,
      url: url.toString(),
      code: readStringField(payload, 'code'),
      details: readDetails(payload),
    });
  }

  if (!schema) return payload as T;

  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    throw new ApiError({
      message: `Response from ${url.pathname} did not match its schema`,
      status: response.status,
      url: url.toString(),
      code: RESPONSE_VALIDATION_FAILED,
      cause: parsed.error,
    });
  }

  return parsed.data;
}

function readStringField(payload: unknown, field: string) {
  if (!payload || typeof payload !== 'object') return undefined;
  const value = (payload as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Field-level validation errors, when the API sends them. The shape below is
 * the common `{ errors: { email: ['...'] } }` convention — adjust it to your
 * backend once, here, and `useHookFormActionErrorMapper` keeps working.
 */
function readDetails(payload: unknown) {
  if (!payload || typeof payload !== 'object') return undefined;

  const { errors } = payload as { errors?: unknown };
  if (!errors || typeof errors !== 'object') return undefined;

  const details: Record<string, string[]> = {};

  for (const [field, value] of Object.entries(errors)) {
    if (Array.isArray(value)) details[field] = value.map(String);
    else if (typeof value === 'string') details[field] = [value];
  }

  return Object.keys(details).length > 0 ? details : undefined;
}
