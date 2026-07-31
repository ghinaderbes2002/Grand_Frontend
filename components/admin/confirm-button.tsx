"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { idleFormState, type FormState } from "@/lib/forms/state";
import { useI18n } from "@/lib/i18n/context";

/**
 * Destructive action behind a two-step confirm.
 *
 * The confirmation is an inline state change rather than `window.confirm`,
 * which blocks the main thread and cannot be styled or translated.
 */
export function ConfirmButton({
  action,
  label,
  pendingLabel,
  confirmLabel,
}: {
  action: (prevState: FormState) => Promise<FormState>;
  label: string;
  pendingLabel: string;
  confirmLabel?: string;
}) {
  const { dict } = useI18n();
  const [armed, setArmed] = useState(false);
  const [state, formAction, isPending] = useActionState(action, idleFormState);

  if (!armed) {
    return (
      <div className="flex flex-col gap-2">
        <FormError state={state} />
        <Button
          type="button"
          variant="ghost"
          className="text-danger border-danger/40 w-fit"
          onClick={() => setArmed(true)}
        >
          {label}
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <FormError state={state} />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          className="bg-danger w-fit text-white"
        >
          {isPending ? pendingLabel : (confirmLabel ?? label)}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-fit"
          onClick={() => setArmed(false)}
          disabled={isPending}
        >
          {dict.common.cancel}
        </Button>
      </div>
    </form>
  );
}
