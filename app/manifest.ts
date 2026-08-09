import type { MetadataRoute } from "next";

import { defaultLocale, getDirection } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

/**
 * Lets the storefront be installed to a phone's home screen.
 *
 * Single-locale by necessity: a manifest has one name and one direction, and
 * Arabic is the default, so it describes the Arabic entry point. The site
 * itself still switches language normally once open.
 */
export default function manifest(): MetadataRoute.Manifest {
  const dict = getDictionary(defaultLocale);

  return {
    name: dict.common.appName,
    short_name: dict.common.appName,
    description: dict.home.subtitle,
    lang: defaultLocale,
    dir: getDirection(defaultLocale),
    start_url: `/${defaultLocale}`,
    display: "standalone",
    background_color: "#111315",
    theme_color: "#111315",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
