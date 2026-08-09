/**
 * Placeholders for loading states. Every route in this app is dynamic and
 * uncached, so navigation always waits on the API — without these the browser
 * sits on the previous page with no sign that anything is happening.
 *
 * These are `aria-hidden`; the boundary that renders them announces the wait.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`bg-surface border-border animate-pulse rounded-lg border ${className}`}
    />
  );
}

/** A few stacked bars, for list-shaped content. */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}

/** Product cards, matching the shop grid so the layout does not jump. */
export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex flex-col gap-3">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}

/** The title block every page opens with. */
export function SkeletonHeader() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
  );
}
