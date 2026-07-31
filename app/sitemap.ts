import type { MetadataRoute } from "next";

import { listProducts } from "@/lib/api/products";
import { locales } from "@/lib/i18n/config";

/**
 * Published products in both locales.
 *
 * `GET /products` is cursor-paginated, so this walks the pages rather than
 * trusting a single request to return everything. It caps out to keep a
 * catalogue explosion from turning the sitemap into a slow endpoint.
 */
const PAGE_SIZE = 100;
const MAX_PRODUCTS = 5_000;

/**
 * Generated per request rather than at build time: products are added long
 * after a deploy, and a sitemap frozen at build would never mention them.
 * Crawlers hit this rarely, so the cost is negligible.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.SITE_URL ?? "http://localhost:3001").replace(/\/$/, "");

  const entries: MetadataRoute.Sitemap = locales.map((locale) => ({
    url: `${base}/${locale}/shop`,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const slugs: string[] = [];
  let cursor: string | undefined;

  try {
    while (slugs.length < MAX_PRODUCTS) {
      const page = await listProducts({ cursor, limit: PAGE_SIZE });
      slugs.push(...page.items.map((product) => product.slug));

      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }
  } catch {
    // A sitemap missing its products is better than a 500 on /sitemap.xml.
  }

  for (const slug of slugs) {
    for (const locale of locales) {
      entries.push({
        url: `${base}/${locale}/shop/${slug}`,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
