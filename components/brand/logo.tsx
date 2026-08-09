/**
 * The brand mark: an ink drop.
 *
 * Solid, in a single inherited colour. The identity carries no brand hue, so
 * the mark takes the colour of whatever it sits in — near-black on the white
 * page, near-white on the dark one — the same way the rest of the chrome does.
 * A gradient here would be the only chromatic thing on the site.
 *
 * `viewBox` is 32×32 and every point sits on that grid, so the same shape
 * serves the favicon, the header and the share card without redrawing.
 */

const DROP = "M16 2c0 0 9 10.5 9 16a9 9 0 1 1-18 0c0-5.5 9-16 9-16z";

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d={DROP} fill="currentColor" />
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
