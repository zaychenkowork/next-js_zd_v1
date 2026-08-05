import { describe, expect, it } from 'vitest';

import {
  signInSchema,
  updateProfileSchema,
  userProfileSchema,
} from '~/schemas/user';

describe('updateProfileSchema', () => {
  it('trims surrounding whitespace before validating', () => {
    const parsed = updateProfileSchema.parse({
      firstName: '  Ada  ',
      lastName: 'Lovelace',
      email: ' ada@example.com ',
    });

    expect(parsed.firstName).toBe('Ada');
    expect(parsed.email).toBe('ada@example.com');
  });

  it('reports failures as i18n keys, not sentences', () => {
    const result = updateProfileSchema.safeParse({
      firstName: '',
      lastName: 'Lovelace',
      email: 'nope',
    });

    expect(result.success).toBe(false);
    const messages = result.error?.issues.map((issue) => issue.message) ?? [];
    expect(messages).toContain('validation.required');
    expect(messages).toContain('validation.email');
  });

  it('rejects a name longer than the field allows', () => {
    expect(() =>
      updateProfileSchema.parse({
        firstName: 'a'.repeat(61),
        lastName: 'b',
        email: 'a@b.co',
      }),
    ).toThrow();
  });
});

describe('signInSchema', () => {
  it('requires both fields', () => {
    expect(signInSchema.safeParse({ username: '', password: '' }).success).toBe(
      false,
    );
  });

  it('does not impose a password policy the backend owns', () => {
    expect(
      signInSchema.safeParse({ username: 'emilys', password: 'x' }).success,
    ).toBe(true);
  });
});

describe('userProfileSchema', () => {
  it('treats the avatar as optional', () => {
    expect(() =>
      userProfileSchema.parse({
        id: 1,
        username: 'emilys',
        email: 'emily@example.com',
        firstName: 'Emily',
        lastName: 'Johnson',
      }),
    ).not.toThrow();
  });
});
