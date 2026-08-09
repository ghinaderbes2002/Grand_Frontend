import type { ComponentProps } from "react";

type Variant = "primary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-foreground shadow-card hover:opacity-90",
  ghost: "border-border border text-foreground hover:bg-surface",
  danger: "border-danger/40 text-danger border hover:bg-danger/10",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  /** The hero's calls to action, and nothing else. */
  lg: "h-13 px-7 text-base",
};

/**
 * The button's classes, for the cases where the `<button>` element itself is
 * owned by something else — a component that renders its own trigger, say.
 * Prefer `<Button>`; reach for this only when there is no element to hand.
 *
 * `active:scale` gives the press somewhere to land. The reduced-motion rule in
 * globals.css turns the transition off for anyone who asks. Pills, not rounded
 * rectangles: it is the shape that carries most of this palette's warmth.
 * Inputs stay square-ish — a pill text field is hard to scan in a dense admin
 * form.
 */
export function buttonClass({
  variant = "primary",
  size = "md",
  className = "",
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return `inline-flex items-center justify-center gap-2 rounded-full font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${variants[variant]} ${sizes[size]} ${className}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button {...props} className={buttonClass({ variant, size, className })} />;
}
