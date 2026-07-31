"use client";

import type { FormState } from "@/lib/forms/state";
import { translateFormError } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";

export function FormError({ state }: { state: FormState }) {
  const { dict } = useI18n();
  const message = translateFormError(dict, state);

  if (!message) return null;

  return (
    <p
      role="alert"
      className="border-danger/40 bg-danger/10 text-danger rounded-lg border px-3 py-2 text-sm"
    >
      {message}
    </p>
  );
}
