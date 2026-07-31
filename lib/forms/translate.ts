import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ErrorKey, FormState } from "./state";

function isErrorKey(dict: Dictionary, key: string): key is ErrorKey & string {
  return key in dict.errors;
}

/** Turns the dictionary keys a Server Action returned into display strings. */
export function translateFieldErrors(
  dict: Dictionary,
  state: FormState,
  field: string,
): string[] | undefined {
  const keys = state.fieldErrors?.[field];
  if (!keys?.length) return undefined;

  return keys.map((key) => (isErrorKey(dict, key) ? dict.errors[key] : key));
}

/** The form-level message, if any: mapped key first, raw API messages second. */
export function translateFormError(dict: Dictionary, state: FormState): string | null {
  if (state.status !== "error") return null;

  if (state.errorKey) return dict.errors[state.errorKey];
  if (state.details?.length) return state.details.join(" · ");
  if (state.fieldErrors) return null;

  return dict.common.somethingWentWrong;
}
