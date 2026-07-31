"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { apiFetch } from "@/lib/api/client";
import type { TokenPair } from "@/lib/api/types";
import { describeApiError } from "@/lib/forms/api-error";
import { errorState, fieldErrorState, type FormState } from "@/lib/forms/state";
import type { Locale } from "@/lib/i18n/config";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./schemas";
import {
  clearSessionCookies,
  getRefreshToken,
  setSessionCookies,
} from "./session";

/**
 * Auth mutations. These run in a Server Action, which — unlike a Server
 * Component render — may write cookies, so this is a legitimate place to store
 * a rotated token pair.
 */

export async function loginAction(
  locale: Locale,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  try {
    const tokens = await apiFetch<TokenPair>("/auth/login", {
      method: "POST",
      body: parsed.data,
      cache: "no-store",
    });
    await setSessionCookies(tokens);
  } catch (error) {
    return errorState(...describeApiError(error, { 401: "invalidCredentials" }));
  }

  revalidatePath("/", "layout");
  redirect(safeRedirect(formData.get("next"), locale));
}

export async function registerAction(
  locale: Locale,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    firstName: formData.get("firstName") ?? undefined,
    lastName: formData.get("lastName") ?? undefined,
  });

  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  try {
    const tokens = await apiFetch<TokenPair>("/auth/register", {
      method: "POST",
      body: parsed.data,
      cache: "no-store",
    });
    await setSessionCookies(tokens);
  } catch (error) {
    return errorState(
      ...describeApiError(error, { 409: "emailTaken", 400: "weakPassword" }),
    );
  }

  revalidatePath("/", "layout");
  redirect(safeRedirect(formData.get("next"), locale));
}

export async function forgotPasswordAction(
  _locale: Locale,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  try {
    await apiFetch<void>("/auth/forgot-password", {
      method: "POST",
      body: parsed.data,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error, {}));
  }

  // The API answers 200 even for unknown emails, so the UI must not reveal
  // whether the account exists either.
  return { status: "success" };
}

export async function resetPasswordAction(
  locale: Locale,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    newPassword: formData.get("newPassword"),
  });

  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  try {
    await apiFetch<void>("/auth/reset-password", {
      method: "POST",
      body: parsed.data,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(
      ...describeApiError(error, { 400: "invalidResetToken", 404: "invalidResetToken" }),
    );
  }

  // Resetting revokes every session, so any cookies we still hold are dead.
  await clearSessionCookies();
  revalidatePath("/", "layout");
  redirect(`/${locale}/login?reset=1`);
}

export async function logoutAction(locale: Locale) {
  const refreshToken = await getRefreshToken();

  if (refreshToken) {
    try {
      await apiFetch<void>("/auth/logout", {
        method: "POST",
        body: { refreshToken },
        cache: "no-store",
      });
    } catch {
      // Revoking server-side is best effort; dropping the cookies below is what
      // actually logs this browser out.
    }
  }

  await clearSessionCookies();
  revalidatePath("/", "layout");
  redirect(`/${locale}`);
}

export async function logoutAllAction(locale: Locale) {
  try {
    await apiFetch<void>("/auth/logout-all", {
      method: "POST",
      auth: true,
      cache: "no-store",
    });
  } catch {
    // Same as above — clearing cookies is the part that must not fail.
  }

  await clearSessionCookies();
  revalidatePath("/", "layout");
  redirect(`/${locale}`);
}

// ---------------------------------------------------------------------------

/**
 * Only same-origin paths are accepted as a post-login destination, so a crafted
 * `?next=https://evil.example` cannot turn the login page into an open redirect.
 */
function safeRedirect(next: FormDataEntryValue | null, locale: Locale): string {
  const fallback = `/${locale}`;
  if (typeof next !== "string" || !next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
