import { describe, expect, it } from 'vitest';

import {
  ApiError,
  isApiError,
  isTransportError,
  isUnauthorizedError,
} from '~/api/errors';

describe('ApiError', () => {
  it('keeps its class name so Sentry groups issues by error type', () => {
    const error = new ApiError({
      message: 'boom',
      status: 500,
      url: 'https://api.test/x',
    });

    expect(error.name).toBe('ApiError');
    expect(error).toBeInstanceOf(Error);
  });

  it('preserves the original failure as `cause`', () => {
    const cause = new Error('socket hang up');
    const error = new ApiError({
      message: 'wrapped',
      status: 0,
      url: 'https://api.test/x',
      cause,
    });

    expect(error.cause).toBe(cause);
  });
});

describe('error guards', () => {
  const make = (status: number) =>
    new ApiError({ message: 'x', status, url: 'https://api.test/x' });

  it('identifies ApiError and rejects other errors', () => {
    expect(isApiError(make(500))).toBe(true);
    expect(isApiError(new Error('plain'))).toBe(false);
    expect(isApiError('not an error')).toBe(false);
  });

  it('treats only status 0 as a transport failure', () => {
    expect(isTransportError(make(0))).toBe(true);
    expect(isTransportError(make(500))).toBe(false);
  });

  it('treats only status 401 as unauthorized', () => {
    expect(isUnauthorizedError(make(401))).toBe(true);
    expect(isUnauthorizedError(make(403))).toBe(false);
  });
});
