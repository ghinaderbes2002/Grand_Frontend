import type { NextConfig } from "next";

/**
 * Product images live on the object store the API hands back presigned URLs for
 * (MinIO in development, S3-compatible in production). `next/image` refuses
 * remote hosts it has not been told about, so the origin is configured here.
 *
 * When it is unset, `RemoteImage` falls back to `unoptimized`, which bypasses
 * the optimizer entirely — images still render, just without resizing or format
 * conversion. A missing env var must not break the storefront.
 */
function mediaPattern() {
  const origin = process.env.NEXT_PUBLIC_MEDIA_ORIGIN;
  if (!origin) return [];

  try {
    const url = new URL(origin);
    return [
      {
        protocol: url.protocol.replace(":", "") as "http" | "https",
        hostname: url.hostname,
        port: url.port,
        pathname: "/**",
      },
    ];
  } catch {
    // A malformed value should not fail the build; fall back to unoptimized.
    return [];
  }
}

const nextConfig: NextConfig = {
  // Emits a self-contained server bundle with only the dependencies actually
  // used, which is what the Docker image ships. Without it the runtime image
  // has to carry all of node_modules.
  output: "standalone",

  images: {
    remotePatterns: mediaPattern(),
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Stop the browser second-guessing declared content types.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Leak only the origin to third parties, never the full path.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // No embedding — this app has no iframe-based flows.
          { key: "X-Frame-Options", value: "DENY" },
          // Nothing here needs the camera, microphone or location.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
