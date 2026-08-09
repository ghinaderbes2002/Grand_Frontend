import Link from "next/link";

/**
 * Glassmorphism hero: badge, gradient headline, two calls to action, and a
 * frosted panel carrying figures and a marquee.
 *
 * Adapted from a stock agency hero. Four things changed on the way in:
 *
 * 1. **Every figure is a prop.** The original hard-coded "150+ Projects
 *    Delivered" and "98% Client Satisfaction" alongside six invented client
 *    brands. On a storefront those are false claims, so nothing here renders
 *    unless a caller passes real data — and each block disappears when it has
 *    none rather than falling back to a placeholder.
 * 2. **Brand tokens, not literals.** `zinc-950`/`#ffcd75` are replaced by the
 *    theme's own colours, so the panel works in light and dark.
 * 3. **Direction-safe.** Physical margins and transforms became logical ones;
 *    the marquee flips with `dir`, and the arrow mirrors in RTL.
 * 4. **No `<style>` block.** Its keyframes were global and its `.delay-*`
 *    helpers shadowed Tailwind's transition-delay utilities.
 *
 * Server component: it holds no state and fetches nothing. The caller supplies
 * the data.
 */

export type HeroStat = { value: string; label: string };
export type HeroBrand = { id: string; name: string };

export type GlassmorphismTrustHeroProps = {
  /** Small pill above the headline. */
  badge?: string;
  /** Split so the middle line can take the gradient. */
  title: { lead: string; accent: string; tail?: string };
  description: string;
  primaryCta: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
  /** The panel's headline figure, e.g. products in the catalog. */
  headline?: HeroStat;
  /** A 0–100 bar. Omit it unless the number is real and means something. */
  meter?: { label: string; value: string; percent: number };
  /** Three small figures under the divider. */
  stats?: HeroStat[];
  /** Scrolling strip — the brands actually stocked, not invented logos. */
  brands?: HeroBrand[];
  brandsTitle?: string;
};

export default function GlassmorphismTrustHero({
  badge,
  title,
  description,
  primaryCta,
  secondaryCta,
  headline,
  meter,
  stats = [],
  brands = [],
  brandsTitle,
}: GlassmorphismTrustHeroProps) {
  const hasPanel = Boolean(headline || meter || stats.length);

  return (
    <section className="border-border bg-surface/40 relative isolate w-full overflow-hidden rounded-3xl border">
      {/* Decorative layers. The original pulled a photo from a third-party
          bucket; the dot screen and the two ink washes are ours and cost no
          network request. */}
      <div className="halftone absolute inset-0 -z-10" aria-hidden="true" />
      <div
        aria-hidden="true"
        className="bg-brand-gold/20 absolute -top-32 -z-10 size-96 rounded-full blur-3xl inset-s-[-6rem]"
      />
      <div
        aria-hidden="true"
        className="bg-brand-bronze/10 absolute -bottom-40 -z-10 size-80 rounded-full blur-3xl inset-e-[-4rem]"
      />

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-12 px-6 py-16 sm:px-10 sm:py-20 lg:grid-cols-12 lg:gap-10">
        {/* --- copy --- */}
        <div className="flex flex-col gap-7 lg:col-span-7">
          {badge ? (
            <div className="animate-fade-in [animation-delay:100ms]">
              <span className="border-border bg-background/50 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 backdrop-blur-md">
                <span
                  aria-hidden="true"
                  className="from-brand-gold to-brand-bronze h-px w-8 bg-gradient-to-r"
                />
                <span className="text-muted text-xs font-medium">{badge}</span>
              </span>
            </div>
          ) : null}

          <h1 className="animate-fade-in text-display text-balance [animation-delay:200ms]">
            {title.lead}{" "}
            <span className="from-brand-gold to-brand-bronze bg-gradient-to-br bg-clip-text text-transparent">
              {title.accent}
            </span>
            {title.tail ? <> {title.tail}</> : null}
          </h1>

          <p className="animate-fade-in text-muted text-lede max-w-xl [animation-delay:300ms]">
            {description}
          </p>

          <div className="animate-fade-in flex flex-col gap-3 pt-1 sm:flex-row [animation-delay:400ms]">
            <Link
              href={primaryCta.href}
              className="bg-accent text-accent-foreground shadow-card group inline-flex h-13 items-center justify-center gap-2 rounded-full px-8 text-sm font-semibold transition hover:opacity-90 active:scale-[0.98]"
            >
              {primaryCta.label}
              {/* Mirrored in RTL: an arrow that points "forward" points the
                  other way when the page reads right-to-left. */}
              <ArrowIcon className="size-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
            </Link>

            {secondaryCta ? (
              <Link
                href={secondaryCta.href}
                className="border-border bg-background/40 hover:bg-surface inline-flex h-13 items-center justify-center gap-2 rounded-full border px-8 text-sm font-semibold backdrop-blur-sm transition"
              >
                {secondaryCta.label}
              </Link>
            ) : null}
          </div>
        </div>

        {/* --- frosted panel --- */}
        {hasPanel || brands.length ? (
          <div className="flex flex-col gap-6 lg:col-span-5 lg:mt-6">
            {hasPanel ? (
              <div className="animate-fade-in border-border bg-background/50 shadow-raised relative overflow-hidden rounded-3xl border p-8 backdrop-blur-xl [animation-delay:500ms]">
                <div
                  aria-hidden="true"
                  className="bg-accent/10 pointer-events-none absolute -top-16 -z-10 size-64 rounded-full blur-3xl inset-e-[-4rem]"
                />

                {headline ? (
                  <div className="mb-8 flex items-center gap-4">
                    <span className="bg-accent/10 text-accent-strong border-accent/20 flex size-12 items-center justify-center rounded-2xl border">
                      <CatalogIcon className="size-6" />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-3xl font-semibold tracking-tight">
                        {headline.value}
                      </span>
                      <span className="text-muted text-sm">{headline.label}</span>
                    </span>
                  </div>
                ) : null}

                {meter ? (
                  <div className="mb-8 flex flex-col gap-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">{meter.label}</span>
                      <span className="font-medium">{meter.value}</span>
                    </div>
                    <div
                      className="bg-surface h-2 w-full overflow-hidden rounded-full"
                      role="progressbar"
                      aria-label={meter.label}
                      aria-valuenow={meter.percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="from-brand-gold to-brand-bronze h-full rounded-full bg-gradient-to-r"
                        style={{ width: `${Math.min(100, Math.max(0, meter.percent))}%` }}
                      />
                    </div>
                  </div>
                ) : null}

                {stats.length ? (
                  <div className="border-border divide-border grid grid-cols-3 divide-x border-t pt-6 rtl:divide-x-reverse">
                    {stats.map((stat) => (
                      <div
                        key={stat.label}
                        className="flex flex-col items-center justify-center gap-0.5 px-2"
                      >
                        <span className="text-xl font-semibold">{stat.value}</span>
                        <span className="text-muted text-center text-[11px] font-medium">
                          {stat.label}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* The strip needs enough entries that the duplicated track fills
                the width; below that it reads as a stutter, not a marquee. */}
            {brands.length >= 4 ? (
              <div className="animate-fade-in border-border bg-background/50 relative overflow-hidden rounded-3xl border py-8 backdrop-blur-xl [animation-delay:600ms]">
                {brandsTitle ? (
                  <h2 className="text-muted mb-6 px-8 text-sm font-medium">
                    {brandsTitle}
                  </h2>
                ) : null}

                <div
                  className="relative flex overflow-hidden"
                  style={{
                    maskImage:
                      "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
                    WebkitMaskImage:
                      "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
                  }}
                >
                  <div className="animate-marquee flex gap-10 px-4 whitespace-nowrap">
                    {/* Doubled, matching the -50% the keyframe travels. */}
                    {[...brands, ...brands].map((brand, index) => (
                      <span
                        key={`${brand.id}-${index}`}
                        // The second copy is a visual duplicate; a screen
                        // reader should hear this list once.
                        aria-hidden={index >= brands.length || undefined}
                        className="text-muted text-lg font-semibold tracking-tight"
                      >
                        {brand.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* Inline rather than from an icon package: this file needs two glyphs, and the
   house style is stroked `currentColor` paths on a 24 grid. */

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function CatalogIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5Z" />
      <path d="M3 7.5 12 12l9-4.5M12 12v9" />
    </svg>
  );
}
