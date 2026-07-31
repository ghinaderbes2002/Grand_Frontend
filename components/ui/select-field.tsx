import type { ComponentProps } from "react";

export function SelectField({
  name,
  label,
  hint,
  errors,
  options,
  ...props
}: Omit<ComponentProps<"select">, "children"> & {
  name: string;
  label: string;
  hint?: string;
  errors?: string[];
  options: Array<{ value: string; label: string }>;
}) {
  const errorId = `${name}-error`;
  const hasErrors = Boolean(errors?.length);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
        {hint ? <span className="text-muted font-normal"> ({hint})</span> : null}
      </label>
      <select
        {...props}
        id={name}
        name={name}
        aria-invalid={hasErrors || undefined}
        aria-describedby={hasErrors ? errorId : undefined}
        className={`bg-background h-11 rounded-lg border px-3 text-sm outline-none transition focus:ring-2 focus:ring-accent/40 ${
          hasErrors ? "border-danger" : "border-border"
        }`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hasErrors ? (
        <p id={errorId} className="text-danger text-sm">
          {errors!.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
