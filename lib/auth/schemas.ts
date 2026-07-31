import { z } from "zod";

/**
 * Client-side mirror of the backend's validation rules.
 *
 * Messages are dictionary **keys** under `errors`, not sentences — the
 * form component translates them, so a Server Action never needs to know which
 * locale the request came from.
 */

const email = z
  .string({ error: "emailRequired" })
  .trim()
  .min(1, { error: "emailRequired" })
  .pipe(z.email({ error: "emailInvalid" }));

/** Contract: 10-128 chars, and very common passwords are rejected server-side. */
const password = z
  .string({ error: "passwordRequired" })
  .min(1, { error: "passwordRequired" })
  .min(10, { error: "passwordTooShort" })
  .max(128, { error: "passwordTooLong" });

const optionalName = z
  .string()
  .trim()
  .max(100, { error: "nameTooLong" })
  .optional()
  .transform((value) => (value ? value : undefined));

export const loginSchema = z.object({
  email,
  password: z.string({ error: "passwordRequired" }).min(1, { error: "passwordRequired" }),
});

export const registerSchema = z.object({
  email,
  password,
  firstName: optionalName,
  lastName: optionalName,
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string({ error: "tokenRequired" }).trim().min(1, { error: "tokenRequired" }),
  newPassword: password,
});

export type LoginFields = z.infer<typeof loginSchema>;
export type RegisterFields = z.infer<typeof registerSchema>;
export type ForgotPasswordFields = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFields = z.infer<typeof resetPasswordSchema>;
