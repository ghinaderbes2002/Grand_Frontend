import type { ComponentProps } from "react";

export function CheckboxField({
  name,
  label,
  hint,
  ...props
}: ComponentProps<"input"> & {
  name: string;
  label: string;
  hint?: string;
}) {
  return (
    <label
      htmlFor={name}
      className="flex cursor-pointer items-start gap-2.5 text-sm select-none"
    >
      <input
        {...props}
        type="checkbox"
        id={name}
        name={name}
        className="accent-accent mt-0.5 size-4"
      />
      <span className="flex flex-col gap-0.5">
        <span className="font-medium">{label}</span>
        {hint ? <span className="text-muted text-xs">{hint}</span> : null}
      </span>
    </label>
  );
}
