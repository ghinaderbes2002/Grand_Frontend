import type { Metadata, Viewport } from "next";
import { Geist_Mono, Readex_Pro } from "next/font/google";
import { notFound } from "next/navigation";

import { getDirection, isLocale, locales } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n/context";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { themeInitScript } from "@/lib/theme";
import "../globals.css";

/**
 * Readex Pro — the brand face's stand-in.
 *
 * The brand book sets everything in Ping AR + LT, a commercial family that has
 * to be licensed before it can be served. Readex Pro is the closest open match:
 * the same geometric construction, and — the property that matters most — one
 * family drawn for both Arabic and Latin, so a bilingual line never changes
 * voice. Variable, so every weight from 160 to 700 is one file per script.
 *
 * Once the Ping files are licensed, swap this for `next/font/local` pointing at
 * them and keep the `--font-brand` variable: nothing else has to change.
 */
const brand = Readex_Pro({
  variable: "--font-brand",
  subsets: ["arabic", "latin"],
  display: "swap",
});

/** SKUs, codes and order numbers — the only place a second face appears. */
const monoLatin = Geist_Mono({ variable: "--font-mono-latin", subsets: ["latin"] });

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
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1030" },
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
      className={`${brand.variable} ${monoLatin.variable} h-full antialiased`}
      // The theme script below sets `data-theme` before React hydrates, so the
      // attribute legitimately differs from the server's render.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      {/* Only the shell lives here. The storefront and the dashboard are
          separate route groups with their own chrome — the admin has a sidebar
          and no shop header. */}
      <body className="flex min-h-full flex-col">
        <I18nProvider value={{ locale: lang, dir, dict }}>{children}</I18nProvider>
      </body>
    </html>
  );
}
