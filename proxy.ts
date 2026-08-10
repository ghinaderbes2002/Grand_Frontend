import { NextResponse, type NextRequest } from "next/server";

import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
} from "@/lib/auth/cookies";
import { getTokenExpiry, isTokenExpiring } from "@/lib/auth/jwt";
import { refreshTokens } from "@/lib/auth/refresh";
import { ORDERING_ENABLED } from "@/lib/shop/ordering";
import {
  LOCALE_COOKIE,
  defaultLocale,
  isLocale,
  locales,
  localeFromPathname,
  stripLocale,
  type Locale,
} from "@/lib/i18n/config";

/**
 * Routes (locale stripped) that need a session. Prefix match.
 *
 * The ordering routes only join the list when ordering is on — while it is
 * suspended those pages answer 404, and guarding them would turn that 404 into
 * a login prompt, which is exactly what suspending them was meant to avoid.
 */
const PROTECTED_PREFIXES = ORDERING_ENABLED
  ? ["/account", "/admin", "/cart", "/checkout", "/orders"]
  : ["/account", "/admin"];

/** Routes a logged-in user has no business seeing. */
const GUEST_ONLY_PREFIXES = ["/login", "/register", "/forgot-password", "/reset-password"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Locale routing. Everything under `app/` lives at `/[lang]/…`, so a
  //    request without a locale prefix gets redirected before anything else.
  const locale = localeFromPathname(pathname);
  if (!locale) {
    const target = request.nextUrl.clone();
    const preferred = resolveLocale(request);
    target.pathname = pathname === "/" ? `/${preferred}` : `/${preferred}${pathname}`;
    return NextResponse.redirect(target);
  }

  const route = stripLocale(pathname);

  // 2. Keep the access token fresh. This is the ONLY place a normal page
  //    navigation can rotate the refresh token, because it is the only one that
  //    can still write `Set-Cookie` before the render starts.
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const needsRefresh = Boolean(refreshToken) && (!accessToken || isTokenExpiring(accessToken));

  if (needsRefresh && refreshToken) {
    const result = await refreshTokens(refreshToken);

    if (result.ok) {
      return withSession(request, locale, route, result.tokens);
    }

    if (result.reason === "invalid") {
      // Session is dead — drop the cookies so we do not keep hammering
      // `/auth/refresh` with a token the backend has already revoked.
      return withoutSession(request, locale, route);
    }
    // "unreachable": leave the cookies alone and let the page render/fail on
    // its own rather than logging the user out over a network blip.
  }

  const hasSession = Boolean(accessToken || refreshToken);
  const redirectResponse = guardRoute(request, locale, route, hasSession);
  return redirectResponse ?? NextResponse.next();
}

/**
 * Optimistic route guard. It only looks at cookie presence — a cookie is not
 * proof of a valid session, so pages and Server Actions still call
 * `requireSession()`. See the Authentication guide on optimistic checks.
 */
function guardRoute(
  request: NextRequest,
  locale: Locale,
  route: string,
  hasSession: boolean,
) {
  if (!hasSession && PROTECTED_PREFIXES.some((prefix) => route.startsWith(prefix))) {
    const target = request.nextUrl.clone();
    target.pathname = `/${locale}/login`;
    target.search = "";
    target.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(target);
  }

  if (hasSession && GUEST_ONLY_PREFIXES.some((prefix) => route.startsWith(prefix))) {
    const target = request.nextUrl.clone();
    target.pathname = `/${locale}`;
    target.search = "";
    return NextResponse.redirect(target);
  }

  return null;
}

/**
 * Continues the request with a freshly rotated token pair: written to the
 * response so the browser keeps them, and injected into the forwarded request
 * so this very render already sees the new access token.
 */
function withSession(
  request: NextRequest,
  locale: Locale,
  route: string,
  tokens: { accessToken: string; refreshToken: string },
) {
  request.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken);
  request.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken);

  const headers = new Headers(request.headers);
  headers.set("cookie", request.cookies.toString());

  const redirectResponse = guardRoute(request, locale, route, true);
  const response = redirectResponse ?? NextResponse.next({ request: { headers } });

  response.cookies.set(
    ACCESS_TOKEN_COOKIE,
    tokens.accessToken,
    accessCookieOptions(getTokenExpiry(tokens.accessToken)),
  );
  response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, refreshCookieOptions());

  return response;
}

function withoutSession(request: NextRequest, locale: Locale, route: string) {
  request.cookies.delete(ACCESS_TOKEN_COOKIE);
  request.cookies.delete(REFRESH_TOKEN_COOKIE);

  const headers = new Headers(request.headers);
  headers.set("cookie", request.cookies.toString());

  const redirectResponse = guardRoute(request, locale, route, false);
  const response = redirectResponse ?? NextResponse.next({ request: { headers } });

  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);

  return response;
}

/** Explicit choice (cookie) wins over the browser's `Accept-Language`. */
function resolveLocale(request: NextRequest): Locale {
  const fromCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (fromCookie && isLocale(fromCookie)) return fromCookie;

  return matchAcceptLanguage(request.headers.get("accept-language")) ?? defaultLocale;
}

function matchAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      const quality = q ? Number.parseFloat(q.trim().slice(2)) : 1;
      return { tag: tag.toLowerCase(), quality: Number.isNaN(quality) ? 0 : quality };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of ranked) {
    // Match `ar`, `ar-JO`, `en-US`… against our supported base languages.
    const base = tag.split("-")[0];
    const hit = locales.find((candidate) => candidate === base);
    if (hit) return hit;
  }

  return null;
}

export const config = {
  // Skip Next internals, Route Handlers (they manage their own auth) and any
  // path that looks like a static file.
  //
  // `apple-icon` is listed by name because it is the one generated metadata
  // route with no file extension — the dot rule misses it, and locale routing
  // was redirecting it to `/ar/apple-icon`, where nothing exists. iOS then had
  // no home-screen icon at all.
  matcher: ["/((?!_next/static|_next/image|api/|favicon.ico|apple-icon$|.*\\..*).*)"],
};
