import Link from "next/link";

import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

/**
 * The storefront's opening screen: the mark, the store's name, one search
 * field, and the way into the catalog — centred, so the search sits where the
 * eye lands.
 *
 * The backdrop is a CSS background rather than `next/image` on purpose: it is
 * decorative, has no intrinsic size, and going through the optimizer would tie
 * the hero to `images.remotePatterns` for no benefit.
 */
export function StoreHero({
  name,
  tagline,
  description,
  search,
  primaryCta,
  scrollHint,
  /** Any URL under `public/`, or a remote one. Swap freely. */
  image = "/hero-backdrop.svg",
}: {
  name: string;
  tagline: string;
  description: string;
  /** Posts to the shop as a plain GET, so results stay shareable. */
  search: { action: string; label: string; placeholder: string; submit: string };
  primaryCta: { href: string; label: string };
  scrollHint?: { href: string; label: string };
  image?: string;
}) {
  return (
    <section className="relative isolate w-full overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: `url(${image})` }}
      />
      {/* The copy sits on the image, so it needs a guaranteed contrast floor
          rather than luck about how dark that corner happens to be. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-b from-black/75 via-black/65 to-black/85"
      />

      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-7 px-6 py-24 text-center sm:py-32">
        <span className="animate-fade-in flex flex-col items-center gap-4 text-white [animation-delay:100ms]">
          <LogoMark className="size-14" />
          <span className="text-eyebrow text-white/70">{tagline}</span>
        </span>

        {/* Fixed to white: this text is over a dark image in both themes, so it
            cannot follow `--foreground`. */}
        <h1 className="animate-fade-in text-display text-balance text-white [animation-delay:200ms]">
          {name}
        </h1>

        <p className="animate-fade-in text-lede max-w-xl text-white/75 [animation-delay:300ms]">
          {description}
        </p>

        {/* A GET form: the query lands in the URL, so a search is shareable and
            works with JavaScript off. */}
        <form
          method="get"
          action={search.action}
          role="search"
          className="animate-fade-in flex w-full max-w-xl items-center gap-2 rounded-full border border-white/20 bg-white/10 p-1.5 backdrop-blur-md [animation-delay:400ms]"
        >
          <label htmlFor="hero-search" className="sr-only">
            {search.label}
          </label>
          <SearchIcon className="text-white/60 mx-3 size-5 shrink-0" />
          <input
            id="hero-search"
            name="q"
            type="search"
            placeholder={search.placeholder}
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/50"
          />
          <Button type="submit" className="shrink-0">
            {search.submit}
          </Button>
        </form>

        <div className="animate-fade-in [animation-delay:500ms]">
          <Link href={primaryCta.href}>
            <Button
              size="lg"
              variant="ghost"
              // `ghost` borders and text follow the theme; over the image they
              // have to be white in both.
              className="border-white/30 text-white hover:bg-white/10"
            >
              {primaryCta.label}
            </Button>
          </Link>
        </div>
      </div>

      {scrollHint ? (
        <Link
          href={scrollHint.href}
          className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 text-white/60 transition hover:text-white sm:flex"
        >
          <span className="text-[11px] font-medium tracking-[0.2em] uppercase">
            {scrollHint.label}
          </span>
          <span aria-hidden="true" className="h-10 w-px bg-white/40" />
        </Link>
      ) : null}
    </section>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
