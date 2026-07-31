import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiFetch } from "@/lib/api/client";
import { ApiError, NetworkError } from "@/lib/api/errors";
import type { CurrentUser, TokenPair } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/config";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
} from "./cookies";
import { getTokenExpiry } from "./jwt";

/**
 * The session, as far as this app is concerned.
 *
 * Identity is read from `GET /auth/me` rather than decoded out of the JWT: the
 * contract pins down that response exactly, but not the token's claim names.
 * `cache` keeps it to one call per request no matter how many components ask.
 */
export const getSession = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;

  // No access cookie means either logged out, or the proxy could not refresh.
  if (!accessToken) return null;

  try {
    return await apiFetch<CurrentUser>("/auth/me", {
      auth: accessToken,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthorized) return null;
    throw error;
  }
});

/**
 * Like {@link getSession} but never throws — a backend outage yields `null`
 * instead of an error page. Use for UI chrome (headers, nav) where degrading to
 * the logged-out state beats taking the whole page down.
 */
export async function getSessionOrNull(): Promise<CurrentUser | null> {
  try {
    return await getSession();
  } catch (error) {
    if (error instanceof NetworkError || error instanceof ApiError) return null;
    throw error;
  }
}

/**
 * Guards a page or Server Action. `proxy.ts` already does an optimistic check,
 * but that only looks at cookies — this is the real one.
 */
export async function requireSession(
  locale: Locale,
  redirectTo?: string,
): Promise<CurrentUser> {
  const session = await getSession();
  if (session) return session;

  const next = redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : "";
  redirect(`/${locale}/login${next}`);
}

export function hasPermission(session: CurrentUser | null, permission: string) {
  return session?.permissions.includes(permission) ?? false;
}

/**
 * Persists a token pair. Only callable from a Server Action or Route Handler —
 * cookies cannot be written during a Server Component render.
 */
export async function setSessionCookies(tokens: TokenPair) {
  const store = await cookies();
  store.set(
    ACCESS_TOKEN_COOKIE,
    tokens.accessToken,
    accessCookieOptions(getTokenExpiry(tokens.accessToken)),
  );
  store.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, refreshCookieOptions());
}

export async function clearSessionCookies() {
  const store = await cookies();
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
}

export async function getRefreshToken() {
  const store = await cookies();
  return store.get(REFRESH_TOKEN_COOKIE)?.value ?? null;
}
