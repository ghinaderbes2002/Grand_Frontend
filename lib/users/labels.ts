import type { RoleKey } from "@/lib/api/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";

/**
 * The Arabic/English name of a role.
 *
 * `/auth/me` returns one of the six documented `roleKey` values, but nothing
 * pins down that `/users` uses the same spelling, and an unlabelled account
 * would render as an empty badge that says nothing about what went wrong.
 * Falling back to the raw value keeps the screen readable and names the culprit.
 */
export function roleLabel(dict: Dictionary, roleKey: RoleKey): string {
  const roles: Record<string, string | undefined> = dict.roles;
  return roles[roleKey] ?? roleKey ?? "—";
}

/** Whether the backend's value is one this UI has a label and a form entry for. */
export function isKnownRole(roleKey: RoleKey, known: readonly RoleKey[]): boolean {
  return known.includes(roleKey);
}
