/**
 * The one small status pill.
 *
 * Eleven of these were being written by hand across the app and had drifted
 * into three different paddings and two different radii. Tones are semantic —
 * pick by meaning, not by colour.
 */
export type BadgeTone = "neutral" | "accent" | "success" | "danger" | "warning";

const tones: Record<BadgeTone, string> = {
  neutral: "border-border text-muted",
  accent: "border-accent/40 text-accent bg-accent/5",
  success: "border-success/40 text-success bg-success/5",
  danger: "border-danger/40 text-danger bg-danger/5",
  warning: "border-warning/40 text-warning bg-warning/5",
};

export function Badge({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs whitespace-nowrap ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
