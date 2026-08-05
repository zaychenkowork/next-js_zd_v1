import { describe, expect, it } from 'vitest';

import { clientEnvSchema, serverEnvSchema } from '~/schemas/env';

/**
 * The point of splitting the schemas is that neither half can be validated in the
 * other's environment. These tests pin that down, because merging them back into
 * one object is a tempting "simplification" that breaks the browser bundle.
 */
describe('clientEnvSchema', () => {
  it('accepts the minimum required public variables', () => {
    const parsed = clientEnvSchema.parse({
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NEXT_PUBLIC_API_URL: 'https://api.test',
    });

    expect(parsed.NEXT_PUBLIC_ENABLE_DEVTOOLS).toBe(false);
  });

  it('rejects a malformed URL instead of passing it through', () => {
    expect(() =>
      clientEnvSchema.parse({
        NEXT_PUBLIC_APP_URL: 'not-a-url',
        NEXT_PUBLIC_API_URL: 'https://api.test',
      }),
    ).toThrow();
  });

  it('turns the devtools flag into a real boolean', () => {
    const base = {
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NEXT_PUBLIC_API_URL: 'https://api.test',
    };

    expect(
      clientEnvSchema.parse({ ...base, NEXT_PUBLIC_ENABLE_DEVTOOLS: 'true' })
        .NEXT_PUBLIC_ENABLE_DEVTOOLS,
    ).toBe(true);

    expect(
      clientEnvSchema.parse({ ...base, NEXT_PUBLIC_ENABLE_DEVTOOLS: 'yes' })
        .NEXT_PUBLIC_ENABLE_DEVTOOLS,
    ).toBe(false);
  });
});

describe('serverEnvSchema', () => {
  it('requires API_URL', () => {
    expect(() => serverEnvSchema.parse({})).toThrow();
  });

  it('leaves the Sentry variables optional so a fresh clone runs without them', () => {
    expect(() =>
      serverEnvSchema.parse({ API_URL: 'https://api.test' }),
    ).not.toThrow();
  });
});
