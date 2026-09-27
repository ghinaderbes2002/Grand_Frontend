import Link from "next/link";
import type { ReactNode } from "react";

import { ArcField } from "@/components/brand/arc-field";
import { LogoMark } from "@/components/brand/logo";
import { Swoosh } from "@/components/brand/swoosh";
import { buttonClass } from "@/components/ui/button";

/** One item in the panel that straddles the hero's bottom edge. */
export type HeroFeature = { id: string; title: string; body: string };

/** One figure in the row under the calls to action. */
export type HeroStat = { id: string; value: string; label: string };

/**
 * The storefront's opening screen — Grand's navy field, with the logo's arcs
 * sweeping in beside the headline and drifting slowly behind it.
 *
 * The composition is the brand book's own: the navy ground of its stationery,
 * the arcs at a scale far larger than the logo, red rationed to the one call to
 * action and the swoosh under the accented word. White text throughout, since
 * the field is dark in both themes; the ground is built from `--footer`, the
 * token guaranteed to stay dark whichever theme is active.
 *
 * The backdrop is a CSS background rather than `next/image` on purpose: it is
 * decorative, has no intrinsic size, and going through the optimizer would tie
 * the hero to `images.remotePatterns` for no benefit.
 *
 * A server component: it holds no state and fetches nothing. Every motion is
 * CSS and stops under `prefers-reduced-motion`.
 */
export function StoreHero({
  badge,
  title,
  description,
  primaryCta,
  secondaryCta,
  features = [],
  stats = [],
  /** Any URL under `public/`, or a remote one. Swap freely. */
  image = "/hero-backdrop.svg",
}: {
  badge: string;
  /** The headline, split so the middle word can carry the swoosh. */
  title: { lead: string; accent: string; tail: string };
  description: string;
  primaryCta: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
  /** Up to three. Omitted entirely when the caller passes none. */
  features?: HeroFeature[];
  stats?: HeroStat[];
  image?: string;
}) {
  return (
    <section className="bg-footer relative isolate w-full text-white">
      {/* The ground and everything drawn on it are clipped here rather than on
          the section, so the feature panel can still hang over the edge. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
        <div
          // The backdrop's red bloom sits behind the arcs, so it mirrors with
          // them in RTL.
          className="absolute inset-0 bg-cover bg-center rtl:-scale-x-100"
          style={{ backgroundImage: `url(${image})` }}
        />

        {/* The weave from the brand book's cover, barely there. */}
        <div className="mesh absolute inset-0 text-white opacity-[0.05]!" />

        {/* The arcs. Outline rings drift behind; the solid mark sweeps in on
            top. Anchored to the far edge from the copy — `end-*` flips it in
            RTL — and pushed partly off-canvas so it reads as a field, not a
            badge. On a phone it fades back behind the text. */}
        <div className="absolute top-1/2 -end-[22rem] w-[46rem] -translate-y-1/2 opacity-30 sm:-end-72 lg:-end-40 lg:w-[52rem] lg:opacity-100 xl:-end-24">
          <div className="animate-orbit absolute inset-[-12%]">
            <ArcField className="size-full text-white/[0.07]" />
          </div>
          <div className="animate-orbit-reverse absolute inset-[-32%]">
            <ArcField className="size-full text-white/[0.05]" />
          </div>
          <LogoMark tone="reversed" animated className="relative h-auto w-full" />
        </div>

        {/* Keeps the copy's side of the field deep, so white text never has to
            compete with an arc behind it. Flipped for RTL — gradients do not
            mirror themselves. */}
        <div className="from-footer via-footer/70 rtl:bg-linear-to-l absolute inset-0 bg-linear-to-r to-transparent lg:via-footer/40" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 pt-20 pb-12 sm:pt-28 sm:pb-44">
        <div className="flex max-w-2xl flex-col items-start gap-7 text-start">
          <span className="animate-fade-in inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.07] py-1.5 ps-1.5 pe-4 backdrop-blur-md [animation-delay:100ms]">
            <span className="bg-brand flex size-7 items-center justify-center rounded-full">
              <LogoMark tone="white" className="size-4" />
            </span>
            <span className="text-sm font-medium text-white/85">{badge}</span>
          </span>

          <h1 className="animate-fade-in text-display text-balance [animation-delay:200ms]">
            {title.lead}{" "}
            <span className="text-display-accent">
              {title.accent}
              <Swoosh />
            </span>{" "}
            {title.tail}
          </h1>

          <p className="animate-fade-in text-lede max-w-xl text-white/70 [animation-delay:300ms]">
            {description}
          </p>

          <div className="animate-fade-in flex flex-wrap items-center gap-3 [animation-delay:400ms]">
            <Link href={primaryCta.href} className={buttonClass({ variant: "brand", size: "lg" })}>
              {primaryCta.label}
              <ArrowIcon />
            </Link>
            {secondaryCta ? (
              <Link
                href={secondaryCta.href}
                className={buttonClass({ variant: "onDark", size: "lg" })}
              >
                {secondaryCta.label}
              </Link>
            ) : null}
          </div>

          {stats.length > 0 ? (
            <dl className="animate-fade-in mt-4 flex flex-wrap items-stretch gap-x-5 gap-y-5 sm:gap-x-8 [animation-delay:550ms]">
              {stats.map((stat, index) => (
                <div
                  key={stat.id}
                  className={`flex flex-col gap-1 ${
                    index > 0 ? "border-s border-white/15 ps-5 sm:ps-8" : ""
                  }`}
                >
                  {/* Value first in the DOM but read after its label: the
                      order a screen reader wants is "years of experience: 25+". */}
                  <dt className="order-2 text-xs text-white/55 sm:text-sm">{stat.label}</dt>
                  <dd className="order-1 text-xl font-bold tracking-tight sm:text-3xl">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </div>

      {/* Straddles the bottom edge, so the page starts before the hero has
          finished. The negative margin is what the section below pads for. On
          a phone the three promises stack into a tall column, so there the
          panel simply closes the hero instead of hanging off it. */}
      {features.length > 0 ? (
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-10 sm:-mb-20 sm:px-6 sm:pb-0">
          <ul className="border-border bg-card text-foreground shadow-raised relative grid overflow-hidden rounded-3xl border sm:grid-cols-3">
            {/* The stationery's tricolour, as the panel's top edge. */}
            <span aria-hidden="true" className="brand-rule absolute inset-x-0 top-0 h-1" />

            {features.map((feature, index) => (
              <li
                key={feature.id}
                className="group border-border flex flex-col items-start gap-3 p-8 not-first:border-t sm:p-9 sm:not-first:border-s sm:not-first:border-t-0"
              >
                <span className="flex w-full items-center justify-between">
                  {/* Navy and red in turn, the way the brand book alternates
                      its two fields. */}
                  <span
                    className={`flex size-12 shrink-0 items-center justify-center rounded-2xl transition duration-300 group-hover:-translate-y-0.5 group-hover:rotate-[-6deg] ${
                      index % 2 === 0
                        ? "bg-accent text-accent-foreground"
                        : "bg-brand text-brand-foreground shadow-brand"
                    }`}
                  >
                    {FEATURE_ICONS[index % FEATURE_ICONS.length]}
                  </span>
                  <span aria-hidden="true" className="text-border text-4xl font-bold tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </span>
                <span className="mt-2 text-lg font-semibold">{feature.title}</span>
                <span className="text-muted text-sm leading-relaxed">{feature.body}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/** Points along the reading direction, so it mirrors in RTL. */
function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4.5 rtl:-scale-x-100"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
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
