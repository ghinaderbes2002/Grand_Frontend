"use client";

import { useState, type ComponentProps } from "react";

import { useI18n } from "@/lib/i18n/context";

import { controlClass, labelClass } from "./control";

/**
 * `<Field>` for a password, with an eye button that shows what was typed.
 *
 * The button sits at the input's inline end — the left in Arabic, the right in
 * English — and the input reserves the room for it. `type="button"` so it can
 * never submit the form, and `aria-pressed` tells a screen reader which state
 * it is in.
 */
export function PasswordField({
  name,
  label,
  hint,
  errors,
  ...props
}: Omit<ComponentProps<"input">, "type"> & {
  name: string;
  label: string;
  hint?: string;
  /** Already-translated messages. */
  errors?: string[];
}) {
  const { dict } = useI18n();
  const [visible, setVisible] = useState(false);
  const errorId = `${name}-error`;
  const hasErrors = Boolean(errors?.length);
  const toggleLabel = visible ? dict.common.hidePassword : dict.common.showPassword;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className={labelClass}>
        {label}
        {hint ? <span className="text-muted font-normal"> ({hint})</span> : null}
      </label>
      <div className="relative">
        <input
          {...props}
          type={visible ? "text" : "password"}
          id={name}
          name={name}
          aria-invalid={hasErrors || undefined}
          aria-describedby={hasErrors ? errorId : undefined}
          className={controlClass({ invalid: hasErrors, className: "w-full" })}
          // Inline so it cannot lose to the control's own `px-3` on class order.
          style={{ paddingInlineEnd: "2.75rem" }}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={toggleLabel}
          aria-pressed={visible}
          title={toggleLabel}
          className="text-muted hover:text-foreground absolute inset-y-0 end-0 flex w-11 items-center justify-center transition"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {hasErrors ? (
        <p id={errorId} className="text-danger text-sm">
          {errors!.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5"
    >
      <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.1 3.9M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.9 0 3.5-.6 4.9-1.4" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
    </svg>
  );
}
