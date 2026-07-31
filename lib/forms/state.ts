import type { Dictionary } from "@/lib/i18n/dictionaries";

/** Keys under the shared `errors` namespace in the dictionaries. */
export type ErrorKey = keyof Dictionary["errors"];

/**
 * What every Server Action returns to `useActionState`.
 *
 * Errors travel as dictionary keys rather than sentences so the action stays
 * locale-agnostic. `details` carries raw backend messages for the cases we have
 * no key for — better to show the API's own wording than to swallow it.
 */
export type FormState = {
  status: "idle" | "error" | "success";
  errorKey?: ErrorKey;
  details?: string[];
  /** Field name -> dictionary keys under `errors`. */
  fieldErrors?: Partial<Record<string, string[]>>;
};

export const idleFormState: FormState = { status: "idle" };

export function errorState(errorKey: ErrorKey | undefined, details?: string[]): FormState {
  return { status: "error", errorKey, details };
}

export function fieldErrorState(fieldErrors: Partial<Record<string, string[]>>): FormState {
  return { status: "error", fieldErrors };
}
