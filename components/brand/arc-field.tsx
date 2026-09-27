import { ARCS, MARK_VIEWBOX } from "@/components/brand/logo-paths";

/**
 * The logo's arcs as a hairline watermark — the device the brand book uses on
 * its letterhead and invoice covers, where the crescents are drawn in outline
 * at a scale far larger than the page.
 *
 * Decorative only, and inked in `currentColor`, so the caller sets both the
 * colour and the strength (`text-white/10`, `text-accent/15`). The stroke does
 * not scale with the drawing, so it stays a hairline however large it is set.
 */
export function ArcField({
  className = "",
  /** `split` inks the red crescents in the brand red and the rest in currentColor. */
  split = false,
}: {
  className?: string;
  split?: boolean;
}) {
  return (
    <svg viewBox={MARK_VIEWBOX} className={className} aria-hidden="true" fill="none">
      {ARCS.map((arc) => (
        <path
          key={arc.d}
          d={arc.d}
          stroke={split && arc.tone === "red" ? "var(--brand-red)" : "currentColor"}
          strokeWidth={1.25}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
