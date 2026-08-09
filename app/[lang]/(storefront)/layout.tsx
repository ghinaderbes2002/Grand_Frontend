import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
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

  const dict = getDictionary(lang);

  return (
    <>
      <SiteHeader locale={lang} dict={dict} />
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter locale={lang} dict={dict} />
    </>
  );
}
