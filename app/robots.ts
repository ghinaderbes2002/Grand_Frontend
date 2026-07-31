import type { MetadataRoute } from "next";

/**
 * Only the storefront is worth crawling. Everything else needs a session, so a
 * crawler would get a redirect to the login page at best.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.SITE_URL ?? "http://localhost:3001";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/*/admin", "/*/account", "/*/cart", "/*/checkout", "/*/orders"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
