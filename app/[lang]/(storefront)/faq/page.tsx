import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell, ShopPageHeader } from "@/components/shop/page-shell";
import { Button } from "@/components/ui/button";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/faq">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};

  const dict = getDictionary(lang);
  return {
    title: dict.faq.title,
    description: dict.faq.subtitle,
    alternates: { canonical: `/${lang}/faq` },
  };
}

/**
 * Frequently asked questions.
 *
 * The answers are written against what this app actually does — the cart needs
 * an account, orders carry a status history and a tracking number, wholesale
 * customers get their own price list, quantities have minimums, prices are in
 * USD. Nothing here promises a delivery window, a returns period or a shipping
 * cost, because none of that is implemented and a published FAQ is a promise.
 * Replace the copy in `lib/i18n/dictionaries/*.json` under `faq.items` once the
 * real policies exist.
 *
 * Built on `<details>`: it opens and closes, is keyboard-operable and
 * searchable by the browser's own find-in-page, with no JavaScript at all.
 */
export default async function FaqPage({ params }: PageProps<"/[lang]/faq">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);

  return (
    <PageShell width="narrow">
      <ShopPageHeader title={dict.faq.title} subtitle={dict.faq.subtitle} />

      <ul className="flex flex-col gap-3">
        {dict.faq.items.map((item) => (
          <li key={item.q} className="reveal">
            <details className="border-border bg-surface/40 group rounded-2xl border px-5 py-4 transition">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-start font-medium">
                {item.q}
                {/* Rotates to a minus when open — the state has to be visible
                    without reading the answer. */}
                <span
                  aria-hidden="true"
                  className="border-border text-muted flex size-7 shrink-0 items-center justify-center rounded-full border text-lg leading-none transition group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="text-muted mt-3 text-sm leading-relaxed">{item.a}</p>
            </details>
          </li>
        ))}
      </ul>

      <div className="border-border flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed p-6">
        <p className="text-sm font-medium">{dict.faq.cta}</p>
        <Link href={`/${lang}/account`}>
          <Button size="sm" variant="ghost">
            {dict.faq.ctaAction}
          </Button>
        </Link>
      </div>
    </PageShell>
  );
}
