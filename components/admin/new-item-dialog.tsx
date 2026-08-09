"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

import { PlusIcon } from "@/components/admin/icons";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/forms/state";
import { useI18n } from "@/lib/i18n/context";

const DialogClose = createContext<(() => void) | null>(null);

/**
 * Dismisses the surrounding dialog once a form's action succeeds — a no-op for
 * the same form rendered outside one, which is how the edit pages use them.
 *
 * The success banner goes with the dialog, so the refreshed list is what
 * confirms the write. That is the stronger signal anyway: the new row is there.
 */
export function useCloseOnSuccess(state: FormState) {
  const close = useContext(DialogClose);

  useEffect(() => {
    if (state.status === "success") close?.();
  }, [state.status, close]);
}

/**
 * The "new <thing>" button every listing page opens with, and the modal it
 * puts its creation form in.
 *
 * Built on `<dialog>` rather than a hand-rolled overlay: the platform already
 * gives focus trapping, Escape, inertness of the page behind, and a top-layer
 * that no `z-index` on the sticky header can beat.
 */
export function NewItemDialog({
  label,
  title,
  description,
  children,
}: {
  /** Button text, e.g. "مستخدم جديد". Also names the dialog. */
  label: string;
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  const { dict } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);

  const close = useCallback(() => ref.current?.close(), []);
  const heading = title ?? label;

  return (
    <DialogClose.Provider value={close}>
      <Button type="button" onClick={() => ref.current?.showModal()}>
        <PlusIcon className="size-4" />
        {label}
      </Button>

      <dialog
        ref={ref}
        aria-label={heading}
        // The backdrop is the dialog element itself — a click that lands on the
        // panel has the panel as its target and is left alone.
        onClick={(event) => {
          if (event.target === ref.current) close();
        }}
        className="bg-background text-foreground border-border shadow-card m-auto w-[min(32rem,calc(100vw-2rem))] max-h-[85dvh] overflow-y-auto rounded-2xl border p-0 backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="font-medium">{heading}</h2>
              {description ? (
                <p className="text-muted text-sm">{description}</p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={close}
              aria-label={dict.common.close}
              className="shrink-0 px-2"
            >
              <span aria-hidden="true">✕</span>
            </Button>
          </div>

          {children}
        </div>
      </dialog>
    </DialogClose.Provider>
  );
}
