"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { idleFormState, type FormState } from "@/lib/forms/state";

/** A one-click action with no inputs — status toggles and the like. */
export function StatusButton({
  action,
  label,
  pendingLabel,
}: {
  action: (prevState: FormState) => Promise<FormState>;
  label: string;
  pendingLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, idleFormState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <FormError state={state} />
      <Button type="submit" variant="ghost" disabled={isPending} aria-busy={isPending}>
        {isPending ? pendingLabel : label}
      </Button>
    </form>
  );
}
