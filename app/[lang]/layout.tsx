import type { Metadata } from "next";
import { Cairo, Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";

import { getDirection, isLocale, locales } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n/context";
import { getDictionary } from "@/lib/i18n/dictionaries";
import "../globals.css";

const latin = Geist({ variable: "--font-latin", subsets: ["latin"] });
const monoLatin = Geist_Mono({ variable: "--font-mono-latin", subsets: ["latin"] });
const arabic = Cairo({ variable: "--font-arabic", subsets: ["arabic", "latin"] });

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};

  const dict = getDictionary(lang);
  return {
    // Needed for the relative canonical and OG URLs the product pages set.
    metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3001"),
    title: { default: dict.common.appName, template: `%s · ${dict.common.appName}` },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dir = getDirection(lang);
  const dict = getDictionary(lang);

  return (
    <html
      lang={lang}
      dir={dir}
      className={`${latin.variable} ${monoLatin.variable} ${arabic.variable} h-full antialiased`}
    >
      {/* Only the shell lives here. The storefront and the dashboard are
          separate route groups with their own chrome — the admin has a sidebar
          and no shop header. */}
      <body className="flex min-h-full flex-col">
        <I18nProvider value={{ locale: lang, dir, dict }}>{children}</I18nProvider>
      </body>
    </html>
  );
}
