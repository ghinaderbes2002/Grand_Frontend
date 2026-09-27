import {
  ARCS,
  ARC_NAVY,
  ARC_RED,
  LOGO_VIEWBOX,
  MARK_VIEWBOX,
  REG_R,
  REG_RING,
  WORD_GRAND,
  WORD_GROUP,
} from "@/components/brand/logo-paths";

/**
 * How the logo is inked.
 *
 * - `color` — the brand book's two-colour version. The navy half follows
 *   `--logo-secondary`, which turns white on the dark theme: navy on a
 *   near-black page is invisible, and the book's own reversed version keeps
 *   the red and whitens the navy.
 * - `reversed` — red kept, navy whitened: the two-colour logo on a navy field,
 *   whatever the theme.
 * - `white` — solid white, for the navy and red fields the book places it on.
 * - `mono` — one colour, inherited from `currentColor`.
 */
export type LogoTone = "color" | "reversed" | "white" | "mono";

function inks(tone: LogoTone) {
  if (tone === "reversed") return { primary: "var(--brand-red)", secondary: "#ffffff" };
  if (tone === "white") return { primary: "#ffffff", secondary: "#ffffff" };
  if (tone === "mono") return { primary: "currentColor", secondary: "currentColor" };
  return { primary: "var(--logo-primary)", secondary: "var(--logo-secondary)" };
}

/**
 * The full Grand Group lock-up: arcs, GRAND, GROUP and the ®.
 *
 * Sized by height (`h-10 w-auto`); the width follows from the viewBox. It is an
 * image with a name rather than decoration, so a screen reader announces the
 * brand wherever the lock-up stands alone as a link.
 */
export function Logo({
  tone = "color",
  className = "h-10 w-auto",
  title = "Grand Group",
}: {
  tone?: LogoTone;
  className?: string;
  title?: string;
}) {
  const { primary, secondary } = inks(tone);

  return (
    <svg viewBox={LOGO_VIEWBOX} className={className} role="img" aria-label={title}>
      <g fillRule="evenodd">
        <path fill={primary} d={ARC_RED} />
        <path fill={secondary} d={ARC_NAVY} />
        <path fill={primary} d={WORD_GRAND} />
        <path fill={secondary} d={WORD_GROUP} />
      </g>
      <circle
        cx={REG_RING.cx}
        cy={REG_RING.cy}
        r={REG_RING.r}
        fill="none"
        stroke={primary}
        strokeWidth={REG_RING.strokeWidth}
      />
      <path fill={primary} d={REG_R} />
    </svg>
  );
}

/**
 * The five arcs on their own — the brand's signature, and the motif the rest of
 * the site is built from.
 *
 * `animated` sweeps each crescent in around the shared centre, outermost first
 * (see `.arc-sweep` in globals.css); reduced motion shows them at rest.
 */
export function LogoMark({
  tone = "color",
  className = "size-8",
  animated = false,
}: {
  tone?: LogoTone;
  className?: string;
  animated?: boolean;
}) {
  const { primary, secondary } = inks(tone);

  return (
    <svg viewBox={MARK_VIEWBOX} className={className} aria-hidden="true">
      <g fillRule="evenodd">
        {ARCS.map((arc, index) => (
          <path
            key={arc.d}
            d={arc.d}
            fill={arc.tone === "red" ? primary : secondary}
            className={animated ? "arc-sweep" : undefined}
            style={animated ? { animationDelay: `${120 + index * 110}ms` } : undefined}
          />
        ))}
      </g>
    </svg>
  );
}
