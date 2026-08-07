/**
 * One error type for everything the API layer can go wrong with, so callers
 * write one `catch` and one type guard instead of three.
 *
 * `status` carries the discrimination:
 *   - `>= 400` — the server answered with a failure;
 *   - `0`      — no response at all (DNS, connection reset, timeout, abort);
 *   - any status with `code === 'RESPONSE_VALIDATION_FAILED'` — the server
 *     answered successfully but the body did not match the schema, which is a
 *     contract bug on one side or the other and must never reach a component as
 *     `undefined`.
 */
export const RESPONSE_VALIDATION_FAILED = 'RESPONSE_VALIDATION_FAILED';

type ApiErrorInit = {
  /*
   * The error message.
   */
  message: string;
  /*
   * The HTTP status code.
   */
  status: number;
  /*
   * The URL of the API endpoint.
   */
  url: string;
  /*
   * The error code.
   */
  code?: string;
  /*
   * Field-level messages, keyed by field name, when the API returns them.
   */
  /*
   * Field-level messages, keyed by field name, when the API returns them.
   */
  details?: Record<string, string[]>;
  /*
   * The cause of the error.
   */
  cause?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly url: string;
  readonly code: string | undefined;
  readonly details: Record<string, string[]> | undefined;

  constructor({ message, status, url, code, details, cause }: ApiErrorInit) {
    super(message, { cause });

    // Without this the class name is lost through transpilation and Sentry
    // groups every API failure under "Error".
    this.name = 'ApiError';
    this.status = status;
    this.url = url;
    this.code = code;
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isUnauthorizedError(error: unknown): boolean {
  return isApiError(error) && error.status === 401;
}
