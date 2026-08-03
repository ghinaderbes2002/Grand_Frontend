import Link from "next/link";

/**
 * The shared width and rhythm for shop-facing pages.
 *
 * The dashboard has its own shell; this one keeps the storefront pages from
 * each inventing their own max-width and padding, which is what they were
 * doing before.
 */
export function PageShell({
  children,
  width = "wide",
}: {
  children: React.ReactNode;
  /** `wide` for listings, `narrow` for a single column of content. */
  width?: "wide" | "narrow";
}) {
  const max = width === "wide" ? "max-w-6xl" : "max-w-3xl";

  return (
    <div className={`mx-auto flex w-full ${max} flex-1 flex-col gap-8 px-4 py-8`}>
      {children}
    </div>
  );
}

export function ShopPageHeader({
  title,
  subtitle,
  action,
  back,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        {back ? (
          <Link
            href={back.href}
            className="text-muted hover:text-foreground mb-1 text-sm"
          >
            {/* `‹` mirrors with the writing direction; `←` does not. */}
            <span aria-hidden="true">‹ </span>
            {back.label}
          </Link>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-muted text-sm">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </header>
  );
}

/** A bordered panel — the storefront's one container style. */
export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border-border bg-surface/30 rounded-2xl border p-5 ${className}`}>
      {children}
    </div>
  );
}
