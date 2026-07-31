/**
 * Placeholder block for loading states. Every route in this app is dynamic and
 * uncached, so navigation always waits on the API — without these the UI just
 * freezes on the previous page.
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
