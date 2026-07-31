"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { FormSuccess } from "@/components/ui/form-success";
import { SubmitButton } from "@/components/ui/submit-button";
import { commitImportAction, uploadImportAction } from "@/lib/admin/imports";
import type { Uuid } from "@/lib/api/types";
import { idleFormState } from "@/lib/forms/state";
import { translateFieldErrors } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";

export function ImportUploadForm() {
  const { locale, dict } = useI18n();
  const [state, formAction] = useActionState(
    uploadImportAction.bind(null, locale),
    idleFormState,
  );

  const errors = translateFieldErrors(dict, state, "file");

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormError state={state} />

      <label htmlFor="file" className="text-sm font-medium">
        {dict.admin.imports.file}
      </label>
      <input
        id="file"
        name="file"
        type="file"
        accept=".csv,text/csv"
        required
        aria-invalid={errors ? true : undefined}
        className="text-muted file:border-border file:bg-surface file:text-foreground text-sm file:me-3 file:rounded-lg file:border file:px-3 file:py-1.5 file:text-sm"
      />
      {errors ? <p className="text-danger text-sm">{errors.join(" · ")}</p> : null}

      <SubmitButton
        label={dict.admin.imports.upload}
        pendingLabel={dict.admin.imports.uploading}
      />
    </form>
  );
}

export function CommitImportButton({ batchId }: { batchId: Uuid }) {
  const { locale, dict } = useI18n();
  const [state, formAction, isPending] = useActionState(
    commitImportAction.bind(null, locale, batchId),
    idleFormState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormError state={state} />
      <FormSuccess state={state} message={dict.admin.imports.committed} />

      <p className="text-muted text-xs">{dict.admin.imports.commitHint}</p>
      <Button type="submit" disabled={isPending} aria-busy={isPending} className="w-fit">
        {isPending ? dict.admin.imports.committing : dict.admin.imports.commit}
      </Button>
    </form>
  );
}
