"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { apiFetch } from "@/lib/api/client";
import type { ImportBatch, Uuid } from "@/lib/api/types";
import { requireSession } from "@/lib/auth/session";
import { describeApiError } from "@/lib/forms/api-error";
import { errorState, fieldErrorState, type FormState } from "@/lib/forms/state";
import type { Locale } from "@/lib/i18n/config";

/**
 * CSV import is deliberately two-stage: uploading only parses and validates,
 * and nothing reaches the catalog until a separate commit. Bad rows are
 * excluded rather than aborting the batch.
 */

export async function uploadImportAction(
  locale: Locale,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession(locale);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return fieldErrorState({ file: ["required"] });
  }

  let batch: ImportBatch;
  try {
    // multipart/form-data — apiFetch leaves FormData alone so fetch can set the
    // boundary itself. The API expects the field to be named `file`.
    const payload = new FormData();
    payload.set("file", file);

    batch = await apiFetch<ImportBatch>("/imports/products", {
      method: "POST",
      body: payload,
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error));
  }

  revalidatePath(`/${locale}/admin/imports`, "layout");
  redirect(`/${locale}/admin/imports/${batch.id}`);
}

export async function commitImportAction(
  locale: Locale,
  batchId: Uuid,
  _prevState: FormState,
): Promise<FormState> {
  await requireSession(locale);

  try {
    await apiFetch<ImportBatch>(`/imports/${batchId}/commit`, {
      method: "POST",
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    // 409 means the batch was already committed, or never previewed.
    return errorState(...describeApiError(error, { 409: "notPreviewed" }));
  }

  revalidatePath(`/${locale}/admin/imports/${batchId}`);
  revalidatePath(`/${locale}/admin/imports`);
  return { status: "success" };
}
