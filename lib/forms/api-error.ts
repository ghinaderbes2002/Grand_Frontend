import { ApiError, NetworkError } from "@/lib/api/errors";
import type { ErrorKey } from "./state";

/** Applied unless the caller maps the status to something more specific. */
const DEFAULTS: Partial<Record<number, ErrorKey>> = {
  401: "sessionExpired",
  403: "forbidden",
  404: "notFound",
  429: "tooManyRequests",
};

/**
 * Maps a thrown error to a dictionary key, falling back to the backend's own
 * messages when nothing maps — showing the API's wording beats swallowing it.
 *
 * Returns a tuple shaped for `errorState(...)`.
 */
export function describeApiError(
  error: unknown,
  byStatus: Partial<Record<number, ErrorKey>> = {},
): [ErrorKey | undefined, string[] | undefined] {
  if (error instanceof NetworkError) return ["networkError", undefined];

  if (error instanceof ApiError) {
    const mapped = byStatus[error.status] ?? DEFAULTS[error.status];
    if (mapped) return [mapped, undefined];

    return [undefined, error.messages.length ? error.messages : undefined];
  }

  // Not ours to interpret — let it reach the error boundary.
  throw error;
}
