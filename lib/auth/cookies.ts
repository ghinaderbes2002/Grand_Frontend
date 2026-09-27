/**
 * Cookie names and options for the session. Kept free of `server-only` and of
 * `next/headers` so `proxy.ts` (which reads/writes cookies off the request and
 * response objects instead) can import it too.
 */

export const ACCESS_TOKEN_COOKIE = "ps_at";
export const REFRESH_TOKEN_COOKIE = "ps_rt";

/** Contract: access tokens last 15 minutes. */
export const ACCESS_TOKEN_MAX_AGE = 15 * 60;
/** Contract: refresh tokens last 7 days. */
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

export type CookieOptions = {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
};

/**
 * Whether the session cookies carry `Secure`, decided per request.
 *
 * A browser silently *discards* a `Secure` cookie that arrives over plain
 * HTTP, so a fixed "on in production" setting broke login on any host served
 * without TLS: the login appeared to succeed, the cookies were dropped, and
 * every visit to `/admin` bounced back to the login page. Following the
 * request's actual protocol fixes that for good — `http://` gets a cookie the
 * browser keeps, and the moment the site is put behind HTTPS the same code
 * marks them `Secure` with nothing to change or rebuild.
 *
 * The protocol comes from `x-forwarded-proto` (Next sets it on every request;
 * a TLS-terminating proxy such as Nginx or Caddy overrides it with `https`),
 * then from the request URL. With neither, production stays on the safe side.
 *
 * `COOKIE_SECURE=true|false` still forces the value when a deployment needs
 * to. It is read as a literal `process.env.X` because `proxy.ts` imports this
 * file and the proxy bundle has its environment inlined at build time.
 */
export function isSecureRequest(forwardedProto: string | null, url?: string) {
  const forced = process.env.COOKIE_SECURE;
  if (forced !== undefined && forced !== "") return forced !== "false";

  // A chain of proxies appends: "https, http" — the first hop is the browser's.
  const proto = forwardedProto?.split(",")[0]?.trim().toLowerCase();
  if (proto) return proto === "https";
  if (url) return url.startsWith("https:");
  return process.env.NODE_ENV === "production";
}

function baseOptions(maxAge: number, secure: boolean): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge,
  };
}

/**
 * The access cookie is deliberately given the token's own lifetime: once it
 * expires the cookie disappears, which is the signal the proxy uses to refresh.
 */
export function accessCookieOptions(
  secure: boolean,
  expiresAtSeconds?: number | null,
): CookieOptions {
  const maxAge = expiresAtSeconds
    ? Math.max(1, expiresAtSeconds - Math.floor(Date.now() / 1000))
    : ACCESS_TOKEN_MAX_AGE;
  return baseOptions(maxAge, secure);
}

export function refreshCookieOptions(secure: boolean): CookieOptions {
  return baseOptions(REFRESH_TOKEN_MAX_AGE, secure);
}

/** Options for deleting a cookie via a `Set-Cookie` header. */
export function clearedCookieOptions(secure: boolean): CookieOptions {
  return baseOptions(0, secure);
}
