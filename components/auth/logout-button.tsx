"use client";

import { useCallback, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { logoutAction, logoutAllAction } from "@/lib/auth/actions";
import { useI18n } from "@/lib/i18n/context";

/**
 * Logging out, behind a confirmation.
 *
 * Signing out is one click from a cart that took a while to fill, so it asks
 * first. The question is a `<dialog>` rather than `window.confirm`, which
 * blocks the main thread and can be neither styled nor translated.
 *
 * The trigger is a real submit button inside a real form: the click handler
 * cancels the submission and opens the dialog instead, so with JavaScript off
 * nothing is intercepted and the button simply logs out — the confirmation is
 * an enhancement, never the only path.
 *
 * The caller supplies the trigger's shape (`children` and `className`), because
 * this button is an icon in the storefront header, a full row in the dashboard
 * sidebar, and a plain button on the account page.
 */
export function LogoutButton({
  scope = "session",
  label,
  className = "",
  children,
}: {
  /** `all` revokes every session on the account, not just this browser. */
  scope?: "session" | "all";
  /** Names an icon-only trigger. Omit when the trigger carries its own text. */
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  const { locale, dict } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);

  const close = useCallback(() => ref.current?.close(), []);

  const action =
    scope === "all"
      ? logoutAllAction.bind(null, locale)
      : logoutAction.bind(null, locale);

  const question = scope === "all" ? dict.auth.logoutAllConfirm : dict.auth.logoutConfirm;
  const confirmLabel = scope === "all" ? dict.account.logoutAll : dict.nav.logout;

  return (
    <>
      <form
        action={action}
        onSubmit={(event) => {
          // Only with JavaScript running: without it this handler never fires
          // and the form posts straight through.
          event.preventDefault();
          ref.current?.showModal();
        }}
      >
        <button type="submit" aria-label={label} title={label} className={className}>
          {children}
        </button>
      </form>

      <dialog
        ref={ref}
        aria-label={question}
        // The backdrop is the dialog element itself — a click that lands on the
        // panel has the panel as its target and is left alone.
        onClick={(event) => {
          if (event.target === ref.current) close();
        }}
        className="bg-background text-foreground border-border shadow-card m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border p-0 backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <form action={action} className="flex flex-col gap-5 p-5">
          <p className="text-base font-medium text-balance">{question}</p>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Cancel comes first in the DOM so Escape's natural companion —
                the first focusable control — is the safe one. */}
            <Button type="button" variant="ghost" onClick={close}>
              {dict.common.cancel}
            </Button>
            <ConfirmButton label={confirmLabel} pendingLabel={dict.auth.loggingOut} />
          </div>
        </form>
      </dialog>
    </>
  );
}

/** Split out so `useFormStatus` sits inside the form it reports on. */
function ConfirmButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="bg-danger text-white"
    >
      {pending ? pendingLabel : label}
    </Button>
  );
}
