import type { ComponentProps } from "react";

export function Field({
  name,
  label,
  hint,
  errors,
  ...props
}: ComponentProps<"input"> & {
  name: string;
  label: string;
  hint?: string;
  /** Already-translated messages. */
  errors?: string[];
}) {
  const errorId = `${name}-error`;
  const hasErrors = Boolean(errors?.length);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
        {hint ? <span className="text-muted font-normal"> ({hint})</span> : null}
      </label>
      <input
        {...props}
        id={name}
        name={name}
        aria-invalid={hasErrors || undefined}
        aria-describedby={hasErrors ? errorId : undefined}
        className={`h-11 rounded-lg border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-accent/40 ${
          hasErrors ? "border-danger" : "border-border"
        }`}
      />
      {hasErrors ? (
        <p id={errorId} className="text-danger text-sm">
          {errors!.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
