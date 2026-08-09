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

/**
 * The banner a storefront section opens with — the shop, the categories index.
 *
 * Colour only, no photograph: these are the pages the header points at, and
 * they open dozens of times a session, so the opening has to be cheap and
 * identical every time. The wash is built from `--footer`, the one token that
 * is dark in *both* themes, with `--accent` blooming from the far edge; the
 * copy therefore sits over the deepest part of the gradient and the white text
 * never depends on which theme is active.
 *
 * The title is held to one side rather than centred, and the eyebrow carries a
 * rule that runs back toward the middle of the page — the same device the
 * masthead of a printed section page uses.
 */
export function PageBanner({
  eyebrow,
  title,
  subtitle,
}: {
  /** Usually the store's name: it says which publication this page is from. */
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="relative isolate w-full overflow-hidden">
      <div aria-hidden="true" className="bg-footer absolute inset-0 -z-20" />

      {/* Gradients do not mirror themselves, so the direction is flipped
          explicitly: the dark end always lands under the copy. */}
      <div
        aria-hidden="true"
        className="from-footer via-footer/85 to-accent/45 rtl:bg-linear-to-l absolute inset-0 -z-10 bg-linear-to-r"
      />

      {/* The dot screen, at the strength it is meant to be read at: a surface,
          not a pattern. */}
      <div aria-hidden="true" className="halftone absolute inset-0 -z-10 text-white" />

      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-6 py-24 text-start sm:py-32">
        <span className="flex items-center gap-4">
          {/* `.text-eyebrow` is coloured `--accent-strong`, which is near-black
              on the light theme — over this wash it has to be white in both. */}
          <span className="text-eyebrow text-white/70!">{eyebrow}</span>
          <span aria-hidden="true" className="h-px w-14 bg-white/30 sm:w-24" />
        </span>

        {/* Fixed to white: this text is over a dark wash in both themes, so it
            cannot follow `--foreground`. */}
        <h1 className="text-display text-balance text-white">{title}</h1>

        {subtitle ? <p className="text-lede max-w-xl text-white/70">{subtitle}</p> : null}
      </div>
    </section>
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
        <h1 className="text-title">{title}</h1>
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
    <div
      className={`border-border bg-surface/40 shadow-card rounded-2xl border p-5 ${className}`}
    >
      {children}
    </div>
  );
}
