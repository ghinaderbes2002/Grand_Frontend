import type { ApiErrorBody } from "./types";

/**
 * A non-2xx response from the backend, normalised from the contract's uniform
 * error body: `{ statusCode, message: string | string[], error }`.
 */
export class ApiError extends Error {
  readonly status: number;
  /** Always an array — the API returns a string for single errors. */
  readonly messages: string[];
  readonly error: string;

  constructor(status: number, body: Partial<ApiErrorBody> | null) {
    const messages = normaliseMessages(body?.message);
    super(messages[0] ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.messages = messages;
    this.error = body?.error ?? "Error";
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isNotFound() {
    return this.status === 404;
  }

  /** 409 — business-rule conflicts (duplicate slug, bad transition, no stock…). */
  get isConflict() {
    return this.status === 409;
  }

  /** 400 — validation failure; `messages` holds the per-field messages. */
  get isValidation() {
    return this.status === 400;
  }

  get isRateLimited() {
    return this.status === 429;
  }
}

/** The backend was unreachable — distinct from a rejected request. */
export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super("Could not reach the API");
    this.name = "NetworkError";
    this.cause = cause;
  }
}

function normaliseMessages(message: unknown): string[] {
  if (Array.isArray(message)) {
    return message.filter((m): m is string => typeof m === "string");
  }
  if (typeof message === "string") return [message];
  return [];
}
