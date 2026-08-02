import "server-only";

import { cookies } from "next/headers";

import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { ApiError, NetworkError } from "./errors";

/**
 * Base URL of the backend. Server-side only on purpose: the browser never talks
 * to the API directly, it goes through this app (Server Components, Server
 * Actions, Route Handlers) so tokens stay in httpOnly cookies.
 */
export const API_BASE_URL =
  process.env.API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export type QueryValue = string | number | boolean | undefined | null;

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** JSON-serialised, unless it is a `FormData` (multipart, e.g. CSV import). */
  body?: unknown;
  query?: Record<string, QueryValue>;
  /**
   * - `true` — attach the access token from the request cookies.
   * - a string — attach that token verbatim (used by the refresh flow).
   * - `false`/omitted — public endpoint, no Authorization header.
   */
  auth?: boolean | string;
  headers?: Record<string, string>;
  /** De-duplicates retried order/payment creation. See the contract. */
  idempotencyKey?: string;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
  signal?: AbortSignal;
};

/**
 * Calls the backend and returns the parsed JSON body.
 *
 * Throws {@link ApiError} for any non-2xx response and {@link NetworkError}
 * when the backend is unreachable. A `204` resolves to `undefined`.
 *
 * This does **not** refresh an expired access token. Refresh happens in
 * `proxy.ts`, which is the only place that can persist the rotated refresh
 * token — see `lib/auth/refresh.ts` for why that matters.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    query,
    auth = false,
    headers = {},
    idempotencyKey,
    cache,
    next,
    signal,
  } = options;

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");

  let requestBody: BodyInit | undefined;
  if (body instanceof FormData) {
    // Let fetch set the multipart boundary itself.
    requestBody = body;
  } else if (body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
    requestBody = JSON.stringify(body);
  }

  const token = typeof auth === "string" ? auth : auth ? await readAccessToken() : null;
  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  // A cached response is shared across users. Anything carrying a token is
  // per-user by definition, so caching one would hand one customer's cart or
  // order history to the next visitor. Forcing `no-store` here means a caller
  // cannot make that mistake by passing cache options alongside `auth`.
  const cacheOptions = token
    ? ({ cache: "no-store" } as const)
    : ({ cache, next } as const);

  if (idempotencyKey) {
    requestHeaders.set("Idempotency-Key", idempotencyKey);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: requestHeaders,
      body: requestBody,
      ...cacheOptions,
      signal,
    });
  } catch (cause) {
    throw new NetworkError(cause);
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readJsonOrNull(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await readJsonOrNull(response)) as T;
}

export function buildUrl(path: string, query?: Record<string, QueryValue>) {
  // The leading slash is stripped so the path resolves *relative* to the base.
  // Keeping it would make it absolute and silently discard any path on
  // API_BASE_URL — which breaks deployments where the API sits behind a prefix
  // such as `http://host:3016/api` (NestJS's `setGlobalPrefix`).
  const url = new URL(path.replace(/^\//, ""), `${API_BASE_URL}/`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function readAccessToken() {
  const store = await cookies();
  return store.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

async function readJsonOrNull(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
