import { z } from 'zod';

export const userProfileSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  image: z.string().optional(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

/**
 * Input schema for the profile form. Shared by three consumers without being
 * redefined: react-hook-form's resolver, next-safe-action's `.inputSchema()`
 * (Standard Schema v1, so zod needs no adapter) and the API request body.
 *
 * Messages are i18n **keys**, not sentences. The form renders them through
 * `t(...)`, which is the only way a validation message can be localised without
 * duplicating the schema per locale. See docs/forms.md.
 */
export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'validation.required')
    .max(60, 'validation.maxLength'),
  lastName: z
    .string()
    .trim()
    .min(1, 'validation.required')
    .max(60, 'validation.maxLength'),
  email: z.string().trim().pipe(z.email('validation.email')),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const signInSchema = z.object({
  username: z.string().trim().min(1, 'validation.required'),
  password: z.string().min(1, 'validation.required'),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const signInResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  id: z.number().int(),
  username: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
});

export type SignInResponse = z.infer<typeof signInResponseSchema>;

export const refreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
