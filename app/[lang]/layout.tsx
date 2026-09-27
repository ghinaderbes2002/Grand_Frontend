import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { notFound } from "next/navigation";

import { getDirection, isLocale, locales } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n/context";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { themeInitScript } from "@/lib/theme";
import "../globals.css";

/**
 * Ping AR + LT — the brand face, as the brand book specifies.
 *
 * One family drawn for both Arabic and Latin, so a bilingual line never
 * changes voice. Self-hosted from the brand kit (converted OTF → WOFF2); five
 * weights cover the whole type scale, from the lede's light to the display's
 * black. Arabic's `650` display weight resolves to the Bold file.
 */
const brand = localFont({
  variable: "--font-brand",
  display: "swap",
  src: [
    { path: "../fonts/PingARLT-Light.woff2", weight: "300", style: "normal" },
    { path: "../fonts/PingARLT-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/PingARLT-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/PingARLT-Bold.woff2", weight: "700", style: "normal" },
    { path: "../fonts/PingARLT-Black.woff2", weight: "900", style: "normal" },
  ],
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
    { media: "(prefers-color-scheme: dark)", color: "#050e33" },
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
