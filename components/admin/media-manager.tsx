"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import {
  confirmMediaAction,
  deleteMediaAction,
  presignMediaAction,
} from "@/lib/admin/media";
import type { Media, MediaEntityType, Uuid } from "@/lib/api/types";
import { idleFormState, type FormState } from "@/lib/forms/state";
import { useI18n } from "@/lib/i18n/context";

/**
 * Drives the presign → PUT → confirm flow.
 *
 * The middle step is a direct `PUT` from the browser to storage, so it cannot
 * be a Server Action; the two ends are. If the PUT succeeds but confirm fails,
 * the object is orphaned in storage — the API only records media it can verify,
 * so a failed confirm leaves nothing dangling in the database.
 */
export function MediaManager({
  entityType,
  entityId,
  media,
  revalidate,
  canManage,
}: {
  entityType: MediaEntityType;
  entityId: Uuid;
  media: Media[];
  /** Path to revalidate after a change. */
  revalidate: string;
  canManage: boolean;
}) {
  const { locale, dict } = useI18n();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<FormState>(idleFormState);
  const [busy, setBusy] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function upload(file: File) {
    setBusy(true);
    setState(idleFormState);

    try {
      const presigned = await presignMediaAction(locale, entityType, entityId, {
        name: file.name,
        type: file.type,
        size: file.size,
      });

      if (!presigned.ok) {
        setState(presigned.state);
        return;
      }

      const put = await fetch(presigned.presign.uploadUrl, {
        method: "PUT",
        body: file,
      }).catch(() => null);

      if (!put?.ok) {
        setState({ status: "error", errorKey: "uploadFailed" });
        return;
      }

      const confirmed = await confirmMediaAction(
        locale,
        entityType,
        entityId,
        presigned.presign.key,
        media.length,
        revalidate,
      );

      setState(confirmed);
      if (confirmed.status === "success") {
        if (inputRef.current) inputRef.current.value = "";
        startTransition(() => router.refresh());
      }
    } finally {
      setBusy(false);
    }
  }

  function remove(id: Uuid) {
    setBusy(true);
    setState(idleFormState);

    deleteMediaAction(locale, id, revalidate)
      .then((result) => {
        setState(result);
        if (result.status === "success") {
          startTransition(() => router.refresh());
        }
      })
      .finally(() => setBusy(false));
  }

  const pending = busy || isPending;

  return (
    <div className="flex flex-col gap-4">
      <FormError state={state} />

      {media.length === 0 ? (
        <p className="text-muted text-sm">{dict.admin.media.empty}</p>
      ) : (
        <ul className="grid grid-cols-3 gap-3">
          {media.map((item) => (
            <li key={item.id} className="flex flex-col gap-1.5">
              {/* Storage host is not known at build time, so next/image's
                  remotePatterns cannot cover it — a plain img is correct here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt=""
                className="border-border aspect-square w-full rounded-lg border object-cover"
              />
              {canManage ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-danger h-8 text-xs"
                  disabled={pending}
                  onClick={() => remove(item.id)}
                >
                  {dict.admin.media.remove}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <div className="flex flex-col gap-2">
          <p className="text-muted text-xs">{dict.admin.media.hint}</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={pending}
            aria-label={dict.admin.media.upload}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
            className="text-muted file:border-border file:bg-surface file:text-foreground text-sm file:me-3 file:rounded-lg file:border file:px-3 file:py-1.5 file:text-sm"
          />
          {pending ? (
            <p className="text-muted text-xs">{dict.admin.media.uploading}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
