/**
 * The logo's arc, turned into an underline for the one accented word in a
 * headline.
 *
 * It draws itself in (`.swoosh-draw`), starting from the reading edge — hence
 * the mirror in RTL. `pathLength="1"` keeps the dash animation unitless, so it
 * works whatever width the word ends up.
 *
 * Place it inside a `.text-display-accent` span, which gives it the relative
 * box it hangs from.
 */
export function Swoosh({ className = "text-brand" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 24"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 -bottom-[0.14em] h-[0.26em] w-full rtl:-scale-x-100 ${className}`}
    >
      <path
        d="M3 19C52 6 128 1 197 9"
        fill="none"
        stroke="currentColor"
        strokeWidth={5.5}
        strokeLinecap="round"
        pathLength={1}
        className="swoosh-draw"
      />
    </svg>
  );
}
