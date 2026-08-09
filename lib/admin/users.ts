"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { apiFetch } from "@/lib/api/client";
import type { User, Uuid } from "@/lib/api/types";
import { requireSession } from "@/lib/auth/session";
import { describeApiError } from "@/lib/forms/api-error";
import { compact, text } from "@/lib/forms/fields";
import { errorState, fieldErrorState, type FormState } from "@/lib/forms/state";
import type { Locale } from "@/lib/i18n/config";
import { createUserSchema, userRoleSchema, userStatusSchema } from "./schemas";

/**
 * Staff account management (`users.manage`, `super_admin` only for now).
 *
 * There is no delete: the contract offers status changes instead, which is the
 * right call anyway — orders and stock movements reference the account that
 * made them.
 *
 * Every action refuses to touch the caller's own account. Nothing in the
 * contract stops a super_admin from demoting or disabling themselves, and doing
 * so would lock the last administrator out of the panel with no way back in
 * short of a direct database edit.
 */

export async function createUserAction(
  locale: Locale,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(locale);

  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    firstName: text(formData, "firstName"),
    lastName: text(formData, "lastName"),
    roleKey: formData.get("roleKey"),
  });

  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  try {
    await apiFetch<User>("/users", {
      method: "POST",
      body: compact({ ...parsed.data }),
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(
      // 404 here is the role, not the account — the account is what is being
      // created. The contract spells both out for this endpoint.
      ...describeApiError(error, { 409: "emailTaken", 404: "roleNotFound" }),
    );
  }

  revalidatePath(`/${locale}/admin/users`, "layout");
  return { status: "success" };
}

export async function setUserRoleAction(
  locale: Locale,
  id: Uuid,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession(locale);
  if (session.id === id) return errorState("cannotEditSelf");

  const parsed = userRoleSchema.safeParse({ roleKey: formData.get("roleKey") });

  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  try {
    await apiFetch<User>(`/users/${id}/role`, {
      method: "PATCH",
      body: parsed.data,
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error));
  }

  revalidatePath(`/${locale}/admin/users`, "layout");
  return { status: "success" };
}

export async function setUserStatusAction(
  locale: Locale,
  id: Uuid,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession(locale);
  if (session.id === id) return errorState("cannotEditSelf");

  const parsed = userStatusSchema.safeParse({ status: formData.get("status") });

  if (!parsed.success) {
    return fieldErrorState(z.flattenError(parsed.error).fieldErrors);
  }

  try {
    await apiFetch<User>(`/users/${id}/status`, {
      method: "PATCH",
      body: parsed.data,
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error));
  }

  revalidatePath(`/${locale}/admin/users`, "layout");
  return { status: "success" };
}
