import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

/** The shop-facing chrome. The dashboard has its own and does not get this. */
export default async function StorefrontLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <>
      <SiteHeader locale={lang} dict={getDictionary(lang)} />
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}
