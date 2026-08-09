/**
 * The shared look of a form control.
 *
 * Inputs and selects were being styled inline in seven different files, which
 * is how they drifted to three different heights. Anything that renders a bare
 * `<input>` or `<select>` — including the plain GET filter forms, which cannot
 * use `<Field>` because they carry no label block — pulls its classes here.
 */
export function controlClass({
  invalid = false,
  className = "",
}: { invalid?: boolean; className?: string } = {}) {
  return [
    // No width: every caller puts these in a `flex-col` label, where a child
    // already stretches. Setting `w-full` here would collide with the `w-56`
    // some filters pass, and Tailwind resolves that by CSS order, not by the
    // order of the classes in the string.
    "bg-background h-11 rounded-[0.625rem] border px-3 text-sm",
    "transition outline-none",
    // The global `:focus-visible` rule draws the ring; this only tints the
    // border so the control still reacts to a mouse click.
    "focus:border-accent",
    invalid ? "border-danger" : "border-border",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * The same look for a `<textarea>`, which grows instead of sitting at a fixed
 * height, so it cannot share the `h-11` base.
 */
export function textareaClass({ invalid = false } = {}) {
  return [
    "bg-background w-full rounded-[0.625rem] border px-3 py-2 text-sm",
    "transition outline-none focus:border-accent",
    invalid ? "border-danger" : "border-border",
  ].join(" ");
}

/** The label sitting above a control. */
export const labelClass = "text-sm font-medium";
