import { ImageResponse } from "next/og";

import { getDictionary } from "@/lib/i18n/dictionaries";

/**
 * The card shown when a link to the site is pasted anywhere.
 *
 * Product pages override the image with their own photo; this is the fallback
 * for the home page, the shop and everything else. Without it a shared link
 * renders as a bare grey box.
 *
 * **Latin text only, in every locale.** The renderer behind `ImageResponse`
 * (satori) ships no Arabic-capable font and throws outright on Arabic glyph
 * substitution — an Arabic string here 500s the whole route. The Arabic
 * headline is not lost: social clients read it from `og:title` and
 * `og:description`, which are plain HTML and shape correctly. So the image
 * carries the mark and the wordmark, and the metadata carries the language.
 *
 * To put Arabic *inside* the image, a TTF/OTF (satori cannot read woff2) has
 * to be committed and passed through the `fonts` option.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Printing Store";

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
          background: "#111315",
          color: "#f5f6f7",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        {/* A plain rule — the palette has no gradient to echo. */}
        <div
          style={{
            display: "flex",
            height: 10,
            width: 220,
            borderRadius: 999,
            background: "#f5f6f7",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <svg width="160" height="160" viewBox="0 0 32 32">
            <path
              d="M16 2c0 0 9 10.5 9 16a9 9 0 1 1-18 0c0-5.5 9-16 9-16z"
              fill="#ffffff"
            />
          </svg>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 82, fontWeight: 700, letterSpacing: -2 }}>
              {latin.common.appName}
            </div>
            <div style={{ fontSize: 36, color: "#9aa1a9" }}>{latin.home.title}</div>
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 26, color: "#6b7280" }}>
          {latin.footer.tagline}
        </div>
      </div>
    ),
    size,
  );
}
