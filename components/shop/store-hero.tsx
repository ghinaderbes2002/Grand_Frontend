import Link from "next/link";
import type { ReactNode } from "react";

import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

/** One item in the panel that straddles the hero's bottom edge. */
export type HeroFeature = { id: string; title: string; body: string };

/**
 * The storefront's opening screen: a full-bleed backdrop washed in the brand
 * colour, the store's line and its calls to action held to one side, and a
 * panel of what the store actually offers straddling the bottom edge.
 *
 * The wash is built from `--footer` rather than `--background`, because that is
 * the one token guaranteed to be dark in *both* themes — the copy here is white
 * over an image, so it needs a contrast floor that does not invert. `--accent`
 * only ever appears as a low-opacity glow, where readability does not rest on
 * it.
 *
 * The backdrop is a CSS background rather than `next/image` on purpose: it is
 * decorative, has no intrinsic size, and going through the optimizer would tie
 * the hero to `images.remotePatterns` for no benefit.
 *
 * A server component: it holds no state and fetches nothing.
 */
export function StoreHero({
  badge,
  title,
  description,
  primaryCta,
  secondaryCta,
  features = [],
  /** Any URL under `public/`, or a remote one. Swap freely. */
  image = "/hero-backdrop.svg",
}: {
  badge: string;
  title: string;
  description: string;
  primaryCta: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
  /** Up to three. Omitted entirely when the caller passes none. */
  features?: HeroFeature[];
  image?: string;
}) {
  return (
    <section className="relative isolate w-full">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: `url(${image})` }}
      />

      {/* Two layers, not one: the flat wash guarantees the contrast floor
          wherever the image happens to be light, and the gradient on top puts
          the brand colour behind the copy and lets the photograph read at the
          far edge. Gradients do not mirror themselves, so the direction is
          flipped explicitly for RTL. */}
      <div aria-hidden="true" className="bg-footer/85 absolute inset-0 -z-10" />
      <div
        aria-hidden="true"
        className="from-footer/70 to-accent/40 rtl:bg-linear-to-r absolute inset-0 -z-10 bg-linear-to-l via-transparent"
      />

      <div className="mx-auto w-full max-w-6xl px-6 pt-24 pb-32 sm:pt-32 sm:pb-40">
        <div className="flex max-w-2xl flex-col items-start gap-7 text-start">
          <span className="animate-fade-in inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-white backdrop-blur-md [animation-delay:100ms]">
            <LogoMark className="size-4" />
            {/* `.text-eyebrow` is coloured `--accent-strong`, which is near-black
                on the light theme — over this image it has to be white in both. */}
            <span className="text-eyebrow text-white/80!">{badge}</span>
          </span>

          {/* Fixed to white: this text is over a dark image in both themes, so
              it cannot follow `--foreground`. */}
          <h1 className="animate-fade-in text-display text-balance text-white [animation-delay:200ms]">
            {title}
          </h1>

          <p className="animate-fade-in text-lede text-white/75 [animation-delay:300ms]">
            {description}
          </p>

          <div className="animate-fade-in flex flex-wrap items-center gap-3 [animation-delay:400ms]">
            <Link href={primaryCta.href}>
              <Button size="lg">{primaryCta.label}</Button>
            </Link>
            {secondaryCta ? (
              <Link href={secondaryCta.href}>
                <Button
                  size="lg"
                  variant="ghost"
                  // `ghost` borders and text follow the theme; over the image
                  // they have to be white in both.
                  className="border-white/40 text-white hover:bg-white/10"
                >
                  {secondaryCta.label}
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* Straddles the bottom edge, so the page starts before the hero has
          finished. The negative margin is what the section below pads for. */}
      {features.length > 0 ? (
        <div className="relative z-10 mx-auto -mb-16 w-full max-w-6xl px-4 sm:px-6">
          <ul className="border-border bg-background shadow-raised grid gap-8 rounded-3xl border p-8 sm:grid-cols-3 sm:p-10">
            {features.map((feature, index) => (
              <li key={feature.id} className="flex flex-col items-start gap-3">
                {/* The badges alternate between the two dark tokens, the way a
                    printed page alternates a spot colour with the black. */}
                <span
                  className={`flex size-12 shrink-0 items-center justify-center rounded-full ${
                    index % 2 === 0
                      ? "bg-accent text-accent-foreground"
                      : "bg-footer text-footer-foreground"
                  }`}
                >
                  {FEATURE_ICONS[index % FEATURE_ICONS.length]}
                </span>
                <span className="text-base font-semibold">{feature.title}</span>
                <span className="text-muted text-sm leading-relaxed">{feature.body}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/**
 * One glyph per panel slot, in the order the features arrive: the catalog, the
 * price, the delivery. Positional rather than named — the panel's copy comes
 * from the dictionary, which carries no icon of its own.
 */
const FEATURE_ICONS: ReactNode[] = [
  <GridIcon key="grid" />,
  <TagIcon key="tag" />,
  <TruckIcon key="truck" />,
];

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true" className="size-5">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5"
    >
      <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9z" />
      <circle cx="7.5" cy="7.5" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5"
    >
      <path d="M2 7h11v9H2z" />
      <path d="M13 10h4l4 3.5V16h-8z" />
      <circle cx="7" cy="18" r="1.8" />
      <circle cx="17.5" cy="18" r="1.8" />
    </svg>
  );
}
