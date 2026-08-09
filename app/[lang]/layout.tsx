import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display, Tajawal } from "next/font/google";
import { notFound } from "next/navigation";

import { getDirection, isLocale, locales } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n/context";
import { getDictionary } from "@/lib/i18n/dictionaries";
import "../globals.css";

const latin = Geist({ variable: "--font-latin", subsets: ["latin"] });
const monoLatin = Geist_Mono({ variable: "--font-mono-latin", subsets: ["latin"] });

/**
 * Tajawal for Arabic.
 *
 * Geometric and open, with round counters that stay legible at small sizes —
 * the calm end of Arabic type rather than the technical one. It carries both
 * body and headings: Arabic has no serif/sans pairing convention to borrow, so
 * hierarchy here comes from weight, which is why 700 is loaded alongside the
 * text weights.
 *
 * Four weights, not nine: an Arabic subset is heavy, and each unused weight is
 * a font file nobody asked for.
 */
const arabic = Tajawal({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700"],
});

/**
 * The Latin display face. English keeps the serif-against-sans pairing, which
 * is where that hierarchy convention comes from; Arabic deliberately does not
 * (see `globals.css`). Italic is included: the accented word in the hero
 * headline is set in it, and Arabic has no italic to match.
 */
const displayLatin = Playfair_Display({
  variable: "--font-display-latin",
  subsets: ["latin"],
  weight: ["500", "700"],
  style: ["normal", "italic"],
});

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
    description: dict.home.subtitle,
    applicationName: dict.common.appName,
    // Tells search engines the two locales are the same page, not duplicates.
    alternates: {
      canonical: `/${lang}`,
      languages: Object.fromEntries(locales.map((code) => [code, `/${code}`])),
    },
    openGraph: {
      type: "website",
      siteName: dict.common.appName,
      title: dict.common.appName,
      description: dict.home.subtitle,
      locale: lang,
      url: `/${lang}`,
    },
    twitter: { card: "summary_large_image" },
  };
}

/**
 * Paints the browser chrome to match the page instead of leaving a white bar
 * above a dark site. Two entries so it follows the user's theme.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf5ee" },
    { media: "(prefers-color-scheme: dark)", color: "#17110d" },
  ],
};

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dir = getDirection(lang);
  const dict = getDictionary(lang);

  return (
    <html
      lang={lang}
      dir={dir}
      className={`${latin.variable} ${monoLatin.variable} ${arabic.variable} ${displayLatin.variable} h-full antialiased`}
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
