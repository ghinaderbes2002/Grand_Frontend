import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ArcField } from "@/components/brand/arc-field";
import { LogoMark } from "@/components/brand/logo";
import { PageBanner } from "@/components/shop/page-shell";
import { buttonClass } from "@/components/ui/button";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/about">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};

  const dict = getDictionary(lang);
  return {
    title: dict.about.title,
    description: dict.about.subtitle,
    alternates: { canonical: `/${lang}/about` },
  };
}

/**
 * About Grand Group.
 *
 * The copy is the company's own profile (overview, vision, goals, strengths,
 * sectors, agencies), kept in the dictionaries under `about`. The profile's
 * detailed machine specifications — sizes, wattages, print heads — are left to
 * the product pages, where they belong to a product rather than to the story.
 */
export default async function AboutPage({ params }: PageProps<"/[lang]/about">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const about = dict.about;
  const contactHref =
    process.env.NEXT_PUBLIC_WHATSAPP_URL ?? `tel:${dict.footer.phone.replace(/\s+/g, "")}`;

  return (
    <>
      <PageBanner eyebrow={dict.common.appName} title={about.title} subtitle={about.subtitle} />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 py-20">
        {/* --- overview + since 1996 --- */}
        <section className="grid items-center gap-10 lg:grid-cols-[1.35fr_1fr]">
          <div className="reveal flex flex-col items-start gap-5">
            <Eyebrow>{about.introEyebrow}</Eyebrow>
            <h2 className="text-title">{about.introTitle}</h2>
            {about.introBody.map((paragraph) => (
              <p key={paragraph.slice(0, 24)} className="text-lede text-muted">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="bg-navy reveal relative isolate flex flex-col gap-3 overflow-hidden rounded-[2rem] p-10 text-white">
            <ArcField
              split
              className="absolute -end-24 -bottom-24 -z-10 w-[26rem] text-white/15"
            />
            <LogoMark tone="reversed" className="h-12 w-auto self-start" />
            <span className="mt-6 text-lg font-medium text-white/70">{about.sinceLabel}</span>
            <span className="text-[clamp(4.5rem,3rem+5vw,6.5rem)] leading-none font-bold tracking-tight tabular-nums">
              {about.sinceYear}
            </span>
            <span className="max-w-xs text-white/80">{about.sinceCaption}</span>
          </div>
        </section>

        {/* --- vision --- */}
        <section className="border-border bg-card shadow-card reveal relative overflow-hidden rounded-[2rem] border px-8 py-14 text-center sm:px-16">
          <span aria-hidden="true" className="brand-rule absolute inset-x-0 top-0 h-1" />
          <Eyebrow centered>{about.visionEyebrow}</Eyebrow>
          <p className="mx-auto mt-6 max-w-3xl text-xl leading-relaxed font-medium text-balance sm:text-2xl sm:leading-relaxed">
            <span aria-hidden="true" className="text-brand me-1 text-4xl leading-none font-bold">
              “
            </span>
            {about.vision}
          </p>
        </section>

        {/* --- goals --- */}
        <section className="flex flex-col gap-10">
          <SectionHeading eyebrow={about.goalsEyebrow} title={about.goalsTitle} />
          <ul className="reveal-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {about.goals.map((goal, index) => (
              <li
                key={goal.title}
                className="border-border bg-card shadow-card hover:shadow-raised group flex flex-col gap-4 rounded-3xl border p-7 transition duration-300 hover:-translate-y-1"
              >
                <span
                  className={`flex size-12 items-center justify-center rounded-2xl transition duration-300 group-hover:rotate-[-6deg] ${
                    index % 2 === 0
                      ? "bg-accent text-accent-foreground"
                      : "bg-brand text-brand-foreground shadow-brand"
                  }`}
                >
                  {GOAL_ICONS[index % GOAL_ICONS.length]}
                </span>
                <span className="text-lg font-semibold">{goal.title}</span>
                <span className="text-muted text-sm leading-relaxed">{goal.body}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* --- sectors --- */}
        <section className="flex flex-col gap-10">
          <SectionHeading eyebrow={about.sectorsEyebrow} title={about.sectorsTitle} />
          <ul className="reveal-grid grid gap-5 md:grid-cols-2">
            {about.sectors.map((sector, index) => (
              <li
                key={sector.title}
                // The machines sector is the broadest, so it takes the full row.
                className={`border-border bg-card shadow-card flex flex-col gap-4 rounded-3xl border p-7 ${
                  index === 0 ? "md:col-span-2" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-brand text-3xl font-bold tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="bg-border h-px flex-1" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-semibold">{sector.title}</h3>
                <p className="text-muted leading-relaxed">{sector.body}</p>
                <ul className="mt-1 flex flex-wrap gap-2">
                  {sector.tags.map((tag) => (
                    <li
                      key={tag}
                      className="bg-surface text-foreground rounded-full px-3 py-1 text-xs font-medium"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* --- strengths: the red band --- */}
      <section className="bg-brand text-brand-foreground relative isolate overflow-hidden">
        <div aria-hidden="true" className="mesh absolute inset-0 -z-10 text-white opacity-[0.12]!" />
        <ArcField className="absolute -top-24 -start-40 -z-10 w-[40rem] text-white/15 rtl:-scale-x-100" />

        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="reveal flex flex-col items-start gap-4">
            <span className="flex items-center gap-3 text-sm font-semibold text-white/80">
              <span aria-hidden="true" className="h-0.5 w-8 rounded-full bg-white/70" />
              {about.strengthsEyebrow}
            </span>
            <h2 className="text-title">{about.strengthsTitle}</h2>
          </div>

          <ul className="reveal flex flex-col gap-3">
            {about.strengths.map((strength) => (
              <li
                key={strength}
                className="flex items-start gap-3 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-sm"
              >
                <CheckIcon />
                <span className="font-medium">{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 pt-24">
        {/* --- agencies & brands --- */}
        <section className="flex flex-col gap-10">
          <SectionHeading eyebrow={about.brandsEyebrow} title={about.brandsTitle} />
          <ul className="reveal-grid grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {about.brands.map((brand) => (
              <li
                key={brand.name}
                className="border-border bg-card shadow-card hover:border-accent/40 flex flex-col items-center justify-center gap-1.5 rounded-2xl border px-4 py-7 text-center transition"
              >
                <span dir="ltr" className="text-accent-strong text-lg font-bold tracking-tight">
                  {brand.name}
                </span>
                <span className="text-muted text-xs">{brand.note}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* --- closing call to action --- */}
        <section className="bg-navy reveal relative isolate overflow-hidden rounded-[2rem] px-8 py-14 text-white sm:px-14">
          <LogoMark
            tone="reversed"
            className="pointer-events-none absolute top-1/2 end-12 -z-10 hidden h-auto w-64 -translate-y-1/2 lg:block"
          />
          <div className="flex max-w-xl flex-col items-start gap-5">
            <h2 className="text-title">{dict.home.cta.title}</h2>
            <p className="text-lede text-white/70">{dict.home.cta.body}</p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Link href={`/${lang}/shop`} className={buttonClass({ variant: "brand", size: "lg" })}>
                {dict.home.cta.primary}
              </Link>
              <a href={contactHref} className={buttonClass({ variant: "onDark", size: "lg" })}>
                {dict.home.cta.secondary}
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function Eyebrow({ children, centered = false }: { children: ReactNode; centered?: boolean }) {
  return (
    <span className={`flex items-center gap-3 ${centered ? "justify-center" : ""}`}>
      <span aria-hidden="true" className="bg-accent h-0.5 w-6 rounded-full" />
      <span className="text-eyebrow">{children}</span>
      <span aria-hidden="true" className="bg-brand h-0.5 w-6 rounded-full" />
    </span>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="reveal mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
      <Eyebrow centered>{eyebrow}</Eyebrow>
      <h2 className="text-title">{title}</h2>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="mt-0.5 size-5 shrink-0"
    >
      <circle cx="12" cy="12" r="9" opacity="0.4" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  );
}

/** One glyph per goal, in the dictionary's order: reach, technology, sector, partners. */
const GOAL_ICONS: ReactNode[] = [
  <svg key="reach" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>,
  <svg key="tech" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5">
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    <circle cx="12" cy="12" r="3.5" />
  </svg>,
  <svg key="sector" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5">
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>,
  <svg key="partners" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </svg>,
];
