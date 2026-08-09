/**
 * The brand mark: two sheets of stock, fanned.
 *
 * Paper is what a printing supplier actually moves, and the fanned pair is
 * already the motif in the hero backdrop — the mark and the page now say the
 * same thing. It replaced an ink drop, which read as a generic liquid at small
 * sizes and as a map pin at very small ones.
 *
 * Solid, in a single inherited colour: the identity carries no brand hue, so
 * the mark takes the colour of whatever it sits in. Depth comes from opacity
 * rather than a second colour, which keeps it working in one ink — a favicon,
 * a stamp, an embroidered shirt.
 *
 * `viewBox` is 32×32 and every point sits on that grid, so the same geometry
 * serves the favicon, the header and the share card without redrawing. Kept in
 * sync by hand with `app/icon.svg` and the two `ImageResponse` routes, which
 * cannot import from a component.
 */

/** The front sheet, with its top corner turned back. */
const SHEET = "M12 7h6l5 5v13a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z";
/** The turned corner itself, sitting over the sheet. */
const FOLD = "M18 7l5 5h-4a1 1 0 0 1-1-1Z";

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <g fill="currentColor">
        {/* The sheet behind, tipped out of line so the pair reads as a stack
            rather than as one rectangle. */}
        <rect
          x="6"
          y="6"
          width="13"
          height="20"
          rx="2"
          opacity="0.38"
          transform="rotate(-14 12.5 16)"
        />
        <path d={SHEET} />
        <path d={FOLD} opacity="0.45" />
      </g>
    </svg>
  );
}

/** Mark plus name, the lock-up used in the header and the dashboard sidebar. */
export function Logo({
  name,
  className = "",
  markClassName = "size-8",
  /** Hides the name below `sm`, where the header is tight. */
  responsive = false,
}: {
  name: string;
  className?: string;
  markClassName?: string;
  responsive?: boolean;
}) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className={markClassName} />
      <span
        className={`truncate font-semibold tracking-tight ${
          responsive ? "hidden sm:inline" : ""
        }`}
      >
        {name}
      </span>
    </span>
  );
}
