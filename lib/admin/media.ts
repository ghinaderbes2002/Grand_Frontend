"use server";

import { revalidatePath, updateTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/api/cache";
import { apiFetch } from "@/lib/api/client";
import type {
  Media,
  MediaEntityType,
  MediaMimeType,
  PresignResult,
  Uuid,
} from "@/lib/api/types";
import { MEDIA_MAX_SIZE_BYTES } from "@/lib/api/types";
import { requireSession } from "@/lib/auth/session";
import { describeApiError } from "@/lib/forms/api-error";
import { errorState, type FormState } from "@/lib/forms/state";
import type { Locale } from "@/lib/i18n/config";

/**
 * Media upload is a three-step dance and only the middle step is the browser's:
 *
 *   presign (here) → PUT straight to MinIO/S3 (client) → confirm (here)
 *
 * The file never passes through this server, which is the point — but it also
 * means the confirm step is what makes an upload real. The API re-checks that
 * the object actually landed in storage rather than trusting the client.
 */

const ALLOWED: Record<MediaMimeType, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
};

export type PresignOutcome =
  | { ok: true; presign: PresignResult }
  | { ok: false; state: FormState };

export async function presignMediaAction(
  locale: Locale,
  entityType: MediaEntityType,
  entityId: Uuid,
  file: { name: string; type: string; size: number },
): Promise<PresignOutcome> {
  await requireSession(locale);

  // Mirrored client-side too, but re-checked here: a Server Action is a public
  // endpoint, so the browser's validation is a convenience, not a guarantee.
  const mimeType = file.type as MediaMimeType;
  const extensions = ALLOWED[mimeType];
  if (!extensions) {
    return { ok: false, state: errorState("mediaInvalidType") };
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!extensions.includes(extension)) {
    return { ok: false, state: errorState("mediaInvalidType") };
  }

  if (file.size > MEDIA_MAX_SIZE_BYTES) {
    return { ok: false, state: errorState("mediaTooLarge") };
  }

  try {
    const presign = await apiFetch<PresignResult>("/media/presign", {
      method: "POST",
      body: {
        entityType,
        entityId,
        filename: file.name,
        mimeType,
        size: file.size,
      },
      auth: true,
      cache: "no-store",
    });
    return { ok: true, presign };
  } catch (error) {
    return { ok: false, state: errorState(...describeApiError(error)) };
  }
}

export async function confirmMediaAction(
  locale: Locale,
  entityType: MediaEntityType,
  entityId: Uuid,
  key: string,
  sortOrder: number,
  revalidate: string,
): Promise<FormState> {
  await requireSession(locale);

  try {
    await apiFetch<Media>("/media/confirm", {
      method: "POST",
      body: { key, entityType, entityId, sortOrder },
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error));
  }

  updateTag(CACHE_TAGS.media);
  revalidatePath(revalidate);
  return { status: "success" };
}

export async function deleteMediaAction(
  locale: Locale,
  id: Uuid,
  revalidate: string,
): Promise<FormState> {
  await requireSession(locale);

  try {
    await apiFetch<void>(`/media/${id}`, {
      method: "DELETE",
      auth: true,
      cache: "no-store",
    });
  } catch (error) {
    return errorState(...describeApiError(error));
  }

  updateTag(CACHE_TAGS.media);
  revalidatePath(revalidate);
  return { status: "success" };
}
