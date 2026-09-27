import { ImageResponse } from "next/og";

import {
  ARC_NAVY,
  ARC_RED,
  BRAND,
  LOGO_VIEWBOX,
  MARK_VIEWBOX,
  REG,
  WORD_GRAND,
  WORD_GROUP,
} from "@/components/brand/logo-paths";
import { getDictionary } from "@/lib/i18n/dictionaries";

/**
 * The card shown when a link to the site is pasted anywhere.
 *
 * Product pages override the image with their own photo; this is the fallback
 * for the home page, the shop and everything else. Grand's navy field, the
 * logo reversed out of it, and the arcs in hairline bleeding off the corner —
 * the same composition as the site's hero.
 *
 * **Latin text only, in every locale.** The renderer behind `ImageResponse`
 * (satori) ships no Arabic-capable font and throws outright on Arabic glyph
 * substitution — an Arabic string here 500s the whole route. The Arabic
 * headline is not lost: social clients read it from `og:title` and
 * `og:description`, which are plain HTML and shape correctly.
 *
 * To put Arabic *inside* the image, a TTF/OTF (satori cannot read woff2) has
 * to be committed and passed through the `fonts` option.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Grand Group";

export default function OpengraphImage() {
  const latin = getDictionary("en");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: `linear-gradient(135deg, #0d2c8c 0%, ${BRAND.navy} 45%, #04123f 100%)`,
          color: "#ffffff",
          padding: 72,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* The arcs, large and faint, off the far corner. */}
        <svg
          width="760"
          height="670"
          viewBox={MARK_VIEWBOX}
          style={{ position: "absolute", right: -170, top: -20, opacity: 0.16 }}
        >
          <path fill="#ffffff" fillRule="evenodd" d={ARC_NAVY} />
          <path fill="#ffffff" fillRule="evenodd" d={ARC_RED} />
        </svg>

        {/* The stationery's tricolour. */}
        <div style={{ display: "flex", height: 8, width: 240, borderRadius: 999, overflow: "hidden" }}>
          <div style={{ flex: 1, background: "#ffffff", opacity: 0.35 }} />
          <div style={{ flex: 1, background: "#ffffff" }} />
          <div style={{ flex: 1, background: BRAND.red }} />
        </div>

        <svg width="520" height="285" viewBox={LOGO_VIEWBOX}>
          <path fill={BRAND.red} fillRule="evenodd" d={ARC_RED} />
          <path fill="#ffffff" fillRule="evenodd" d={ARC_NAVY} />
          <path fill={BRAND.red} d={WORD_GRAND} />
          <path fill="#ffffff" d={WORD_GROUP} />
          <path fill={BRAND.red} d={REG} />
        </svg>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 46, fontWeight: 700, letterSpacing: -1 }}>{latin.home.title}</div>
          <div style={{ fontSize: 26, color: "rgba(255,255,255,0.65)" }}>{latin.home.badge}</div>
        </div>
      </div>
    ),
    size,
  );
}
