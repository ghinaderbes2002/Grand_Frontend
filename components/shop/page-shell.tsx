import Link from "next/link";

import { ArcField } from "@/components/brand/arc-field";
import { LogoMark } from "@/components/brand/logo";

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
 * Grand's navy field with the logo's arcs in hairline bleeding off the far
 * edge: the same composition as the home hero, at the height of a section
 * masthead. Colour and line only, no photograph — these are the pages the
 * header points at, and they open dozens of times a session, so the opening has
 * to be cheap and identical every time.
 *
 * Built from `--footer`, the one token that is dark in *both* themes, so the
 * white copy never depends on which theme is active.
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
    <section className="bg-footer relative isolate w-full overflow-hidden text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-cover bg-center rtl:-scale-x-100"
        style={{ backgroundImage: "url(/hero-backdrop.svg)" }}
      />
      <div aria-hidden="true" className="mesh absolute inset-0 -z-10 text-white opacity-[0.05]!" />
      <ArcField
        split
        className="animate-orbit absolute top-1/2 -end-40 -z-10 w-[38rem] -translate-y-1/2 text-white/15 sm:-end-24"
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-6 py-20 text-start sm:py-28">
        <span className="animate-fade-in flex items-center gap-3 [animation-delay:100ms]">
          <LogoMark tone="reversed" className="h-5 w-auto" />
          <span className="text-sm font-medium text-white/70">{eyebrow}</span>
          <span aria-hidden="true" className="h-px w-14 bg-white/25 sm:w-24" />
        </span>

        {/* Fixed to white: this text is over a dark field in both themes, so it
            cannot follow `--foreground`. */}
        <h1 className="animate-fade-in text-display text-balance [animation-delay:200ms]">
          {title}
        </h1>

        {subtitle ? (
          <p className="animate-fade-in text-lede max-w-xl text-white/70 [animation-delay:300ms]">
            {subtitle}
          </p>
        ) : null}
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
        <h1 className="animate-fade-in text-title [animation-delay:100ms]">{title}</h1>
        {subtitle ? (
          <p className="animate-fade-in text-muted text-sm [animation-delay:200ms]">
            {subtitle}
          </p>
        ) : null}
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
      className={`border-border bg-card shadow-card rounded-2xl border p-5 ${className}`}
    >
      {children}
    </div>
  );
}
