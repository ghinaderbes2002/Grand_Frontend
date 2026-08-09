import type { ComponentProps } from "react";

type Variant = "primary" | "ghost" | "danger";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-foreground shadow-card hover:opacity-90",
  ghost: "border-border border text-foreground hover:bg-surface",
  danger: "border-danger/40 text-danger border hover:bg-danger/10",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return (
    <button
      {...props}
      // `active:scale` gives the press somewhere to land. The reduced-motion
      // rule in globals.css turns the transition off for anyone who asks.
      className={`inline-flex items-center justify-center gap-2 rounded-[0.625rem] font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${variants[variant]} ${sizes[size]} ${className}`}
    />
  );
}
