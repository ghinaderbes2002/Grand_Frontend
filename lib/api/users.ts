import "server-only";

import { apiFetch } from "./client";
import type { User, Uuid } from "./types";

/**
 * Staff account reads. Every one of these needs `users.manage`, so they all
 * carry a token — which rules out caching them (see the guard in `client.ts`).
 */
const fresh = { cache: "no-store", auth: true } as const;

/** Everyone, customers included — the contract does not offer a role filter. */
export function listUsers() {
  return apiFetch<User[]>("/users", fresh);
}

export function getUser(id: Uuid) {
  return apiFetch<User>(`/users/${id}`, fresh);
}
