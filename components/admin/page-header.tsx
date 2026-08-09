import Link from "next/link";

/**
 * The title block every dashboard page opens with.
 *
 * It owns the `<h1>`: the shell's greeting is deliberately not a heading, so
 * each page supplies the document's single top-level one.
 */
export function PageHeader({
  title,
  subtitle,
  /** Primary call to action, placed opposite the title. */
  action,
  /** Breadcrumb back to the parent listing, above the title. */
  back,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        {back ? (
          <Link
            href={back.href}
            className="text-muted hover:text-foreground mb-1 text-sm"
          >
            {/* A logical arrow: `‹` mirrors with the writing direction, `←` does not. */}
            <span aria-hidden="true">‹ </span>
            {back.label}
          </Link>
        ) : null}
        <h1 className="text-title">{title}</h1>
        {subtitle ? <p className="text-muted max-w-2xl text-sm">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </header>
  );
}

/** A bordered panel — the dashboard's one container style. */
export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border-border bg-surface/40 shadow-card rounded-2xl border p-5 ${className}`}
    >
      {children}
    </div>
  );
}
