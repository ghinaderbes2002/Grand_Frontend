"use client";

import { useActionState, useEffect, useId, useRef } from "react";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { idleFormState, type FormState } from "@/lib/forms/state";
import { useI18n } from "@/lib/i18n/context";

/**
 * A destructive action behind a confirmation dialog.
 *
 * A native `<dialog>` rather than `window.confirm`, which blocks the main
 * thread and cannot be styled or translated. The platform gives it focus
 * trapping, Escape to close and an inert page behind.
 *
 * If the action fails — a category still in use, say — the reason shows in the
 * dialog, and again under the button once it is closed, so it is not lost.
 */
export function ConfirmButton({
  action,
  label,
  pendingLabel,
  confirmLabel,
  question,
  className = "",
}: {
  action: (prevState: FormState) => Promise<FormState>;
  label: string;
  pendingLabel: string;
  confirmLabel?: string;
  /** Defaults to the generic "are you sure you want to delete" line. */
  question?: string;
  /** Extra classes for the trigger button. */
  className?: string;
}) {
  const { dict } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  // A page can hold several of these (one per linked attribute), so the
  // title id has to be unique.
  const titleId = useId();
  const [state, formAction, isPending] = useActionState(action, idleFormState);

  // A success usually navigates away; if it does not, the dialog closes.
  useEffect(() => {
    if (state.status === "success") ref.current?.close();
  }, [state]);

  const close = () => {
    if (!isPending) ref.current?.close();
  };

  return (
    <div className="flex flex-col gap-2">
      <FormError state={state} />
      <Button
        type="button"
        variant="ghost"
        className={`text-danger border-danger/40 hover:bg-danger/10 w-fit ${className}`}
        onClick={() => ref.current?.showModal()}
      >
        {label}
      </Button>

      <dialog
        ref={ref}
        aria-labelledby={titleId}
        // A click on the backdrop lands on the dialog element itself; one on
        // the panel has the panel as its target and is left alone.
        onClick={(event) => {
          if (event.target === ref.current) close();
        }}
        className="bg-card text-foreground border-border shadow-raised m-auto w-[min(26rem,calc(100vw-2rem))] rounded-3xl border p-0 backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <form action={formAction} className="flex flex-col gap-5 p-6">
          <div className="flex items-start gap-4">
            <span className="bg-danger/10 text-danger flex size-11 shrink-0 items-center justify-center rounded-2xl">
              <TrashIcon />
            </span>
            <div className="flex flex-col gap-1.5">
              <p id={titleId} className="text-lg font-semibold">
                {confirmLabel ?? label}
              </p>
              <p className="text-muted text-sm leading-relaxed">
                {question ?? dict.admin.actions.confirmDelete}
              </p>
            </div>
          </div>

          <FormError state={state} />

          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Cancel first in the DOM, so the control focus lands on when
                the dialog opens is the safe one. */}
            <Button type="button" variant="ghost" onClick={close} disabled={isPending}>
              {dict.common.cancel}
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              aria-busy={isPending}
              className="bg-danger! text-white hover:opacity-90"
            >
              {isPending ? pendingLabel : (confirmLabel ?? label)}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5"
    >
      <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
    </svg>
  );
}
